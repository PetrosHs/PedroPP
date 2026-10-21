
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPI=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};

/*MATH_START*/
// ===== Geometria do circuito oval (estádio): 2 retas + 2 semicírculos. Sentido anti-horário (curvas à esquerda) =====
const TR={cx:150,R:132.25,cz:-160.75,zb:-28.5,zt:-293,S0:158.6};
const LS=300, LC=Math.PI*TR.R, L=2*LS+2*LC;
// Projeta (x,z) na linha central: s = distância ao longo do traçado; lat = deslocamento lateral (+ = esquerda)
function project(x,z){
  if(x>=-TR.cx&&x<=TR.cx){
    if(z>=TR.cz) return {s:x+TR.cx,lat:TR.zb-z};
    return {s:LS+LC+(TR.cx-x),lat:z-TR.zt};
  }
  if(x>TR.cx){const dx=x-TR.cx,dz=z-TR.cz,phi=Math.atan2(dz,dx);
    return {s:LS+(Math.PI/2-phi)*TR.R,lat:TR.R-Math.hypot(dx,dz)};}
  const dx=x+TR.cx,dz=z-TR.cz;let phi=Math.atan2(dz,dx);if(phi<0)phi+=2*Math.PI;
  return {s:2*LS+LC+(1.5*Math.PI-phi)*TR.R,lat:TR.R-Math.hypot(dx,dz)};
}
// Ponto no traçado (s) com deslocamento lateral off (+ = esquerda) e direção th (forward = (sin th, cos th))
function pathAt(s,off=0){
  s=((s%L)+L)%L;let x,z,th;
  if(s<LS){x=s-TR.cx;z=TR.zb-off;th=Math.PI/2;}
  else if(s<LS+LC){const a=(s-LS)/TR.R,phi=Math.PI/2-a,r=TR.R-off;x=TR.cx+r*Math.cos(phi);z=TR.cz+r*Math.sin(phi);th=Math.PI/2+a;}
  else if(s<2*LS+LC){const u=s-LS-LC;x=TR.cx-u;z=TR.zt+off;th=1.5*Math.PI;}
  else{const a=(s-2*LS-LC)/TR.R,phi=1.5*Math.PI-a,r=TR.R-off;x=-TR.cx+r*Math.cos(phi);z=TR.cz+r*Math.sin(phi);th=1.5*Math.PI+a;}
  return {x,z,th};
}
/*MATH_END*/

// ===== Configuração =====
const CFG={laps:3,maxV:52,acc:20,brake:46,revMax:14,maxTurn:0.95,roadHalf:7.6,wall:10.2,wallR:12.5,kartLen:4.5,nCP:12,aiCount:3};
const KARTS=[
  {id:'go',   name:'Go-Kart Clássico', sub:'Leve e ágil',      file:'kart_go',      rotY:0,         seat:[0,0.93,-0.57], H:2.4},
  {id:'cart', name:'Kart Cartoon',     sub:'Divertido',        file:'kart_cartoon', rotY:0,         seat:[0,0.62,-0.50], H:2.2},
  {id:'f1',   name:'F1 Senna 1991',    sub:'Pura velocidade',  file:'kart_f1',      rotY:0,   seat:[0,0.30, 0.47], H:1.7},
];
const PILOTS=[
  {id:'sci', name:'Cientista Farmacêutico', sub:'Piloto 1', file:'pilot_scientist'},
  {id:'mod', name:'Modelagem de Personagens', sub:'Piloto 2', file:'pilot_modelagem'},
];
const AI_COLORS=['#4aa8ff','#ffd24a','#5dff9a'];

// ===== Estado global =====
let renderer,scene,camera,sun,skyDome,particles;
let assets={},karts=[],player=null,state='loading';
let groundRoad=[],groundOther=[];
let roadMaskCanvas=null,roadMaskData=null,roadMaskW=0,roadMaskH=0;
const ROAD_MIN_X=-330,ROAD_MAX_X=350,ROAD_MIN_Z=-340,ROAD_MAX_Z=100,ROAD_SCALE=2;
const sel={kart:0,pilot:0};
const keys={};
const ray=new THREE.Raycaster();ray.far=70;
const DOWN=new THREE.Vector3(0,-1,0),_v=new THREE.Vector3(),_n=new THREE.Vector3();
let raceTime=0,cdTime=0,cdGo=0,goShown=0,lastT=0,audio=null;

// ===== init =====
function init(){
  renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled=true;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.3,2500);
  setupLights();setupEnvironment();
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyR'&&(state==='racing'||state==='countdown'))startRace();});
  addEventListener('keyup',e=>{keys[e.code]=false;});
  loadAssets().then(()=>{buildTrack();buildMenu();$('loading').style.display='none';$('menu').style.display='flex';state='menu';placeGridPreview();requestAnimationFrame(animate);});
  $('startBtn').onclick=()=>{startRace();};
  $('againBtn').onclick=()=>{$('fin').style.display='none';startRace();};
}

// ===== Luzes (Ambient + Directional com sombras) =====
function setupLights(){
  scene.add(new THREE.AmbientLight(0xffffff,0.75));
  scene.add(new THREE.HemisphereLight(0xcfe8ff,0x5a7a3a,0.9));
  sun=new THREE.DirectionalLight(0xfff1d6,2.6);
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  const c=sun.shadow.camera;c.left=-60;c.right=60;c.top=60;c.bottom=-60;c.near=1;c.far=400;
  sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.04;
  scene.add(sun,sun.target);
}

// ===== Ambiente: céu, neblina, árvores =====
function setupEnvironment(){
  scene.fog=new THREE.FogExp2(0xbcd6ee,0.0022);
  const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#2f6fbd');gr.addColorStop(0.55,'#8fc0ec');gr.addColorStop(1,'#d8e9f7');
  g.fillStyle=gr;g.fillRect(0,0,4,256);
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
  skyDome=new THREE.Mesh(new THREE.SphereGeometry(1800,24,16),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false,depthWrite:false}));
  skyDome.renderOrder=-10;scene.add(skyDome);
  particles=makeParticles();scene.add(particles.points);
}
function scatterTrees(){ // árvores colocadas fora do asfalto real, em volta do circuito
  const N=170,trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5,0.8,5,6),new THREE.MeshStandardMaterial({color:0x6b4a2b}),N);
  const leaf=new THREE.InstancedMesh(new THREE.ConeGeometry(4.2,11,7),new THREE.MeshStandardMaterial({color:0x2f7d3a,flatShading:true}),N);
  leaf.castShadow=trunk.castShadow=true;
  const grass=scene.getObjectByName('grass_1'),m=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),p=new THREE.Vector3();
  let n=0,tries=0;
  while(n<N&&tries<5000){
    tries++;
    let x,z;
    if(roadMaskData){
      x=-315+Math.random()*630;z=-305+Math.random()*360;
      if(roadAt(x,z))continue;
      let closeToRoad=false;
      for(const rr of [14,26,38]){
        for(let j=0;j<8;j++){const a=j*Math.PI/4;if(roadAt(x+Math.sin(a)*rr,z+Math.cos(a)*rr)){closeToRoad=true;break;}}
        if(closeToRoad)break;
      }
      if(!closeToRoad)continue;
      const near=nearestRoadPoint(x,z,76);if(!near)continue;
      const d=Math.hypot(x-near.x,z-near.z);if(d<11||d>37)continue;
    }else{
      const pt=pathAt(Math.random()*L,-(34+Math.random()*80));x=pt.x;z=pt.z;
    }
    let y=0;
    if(grass){ray.set(new THREE.Vector3(x,120,z),DOWN);ray.far=300;const h=ray.intersectObject(grass,false);ray.far=70;if(!h.length)continue;y=h[0].point.y;}
    const k=0.8+Math.random()*0.9;sc.set(k,k,k);
    p.set(x,y+2.5*k,z);m.compose(p,q,sc);trunk.setMatrixAt(n,m);
    p.set(x,y+10*k,z);m.compose(p,q,sc);leaf.setMatrixAt(n,m);n++;
  }
  trunk.count=leaf.count=n;scene.add(trunk,leaf);
}
// ===== Carregamento de modelos externos em assets/modelos =====
async function loadAssets(){
  const loader=new GLTFLoader();
  const names=['track', 'kart_go', 'kart_cartoon', 'kart_f1', 'pilot_scientist', 'pilot_modelagem'];
  let done=0;
  await Promise.all(names.map(async n=>{
    try{assets[n]=await loader.loadAsync(`./assets/modelos/${n}.glb`);}
    catch(e){console.warn('Falha ao carregar',n,'→ usando fallback',e);}
    $('loadbar').style.width=(++done/names.length*100)+'%';
  }));
}

// ===== Pista =====
function buildTrack(){
  const g=assets.track;
  if(g){
    g.scene.traverse(o=>{
      if(!o.isMesh)return;
      o.matrixAutoUpdate=false;o.updateMatrix();
      const n=o.name;
      if(['road','grass_1','grass_2','gravel','white_line','rock'].includes(n))o.receiveShadow=true;
      if(n==='road')groundRoad.push(o);
      if(['grass_1','grass_2','gravel'].includes(n))groundOther.push(o);
    });
    scene.add(g.scene);
  }else buildProceduralTrack();
  scene.updateMatrixWorld(true);
  buildRoadMask();
  scatterTrees();
}
// ===== Mapa real do asfalto: usado para limites, IA e minimapa =====
function buildRoadMask(){
  roadMaskCanvas=document.createElement('canvas');
  roadMaskW=Math.ceil((ROAD_MAX_X-ROAD_MIN_X)*ROAD_SCALE);
  roadMaskH=Math.ceil((ROAD_MAX_Z-ROAD_MIN_Z)*ROAD_SCALE);
  roadMaskCanvas.width=roadMaskW;roadMaskCanvas.height=roadMaskH;
  const ctx=roadMaskCanvas.getContext('2d',{willReadFrequently:true});
  ctx.clearRect(0,0,roadMaskW,roadMaskH);
  ctx.fillStyle='#ffffff';
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const px=x=>(x-ROAD_MIN_X)*ROAD_SCALE;
  const pz=z=>(ROAD_MAX_Z-z)*ROAD_SCALE;
  let triangles=0;
  for(const mesh of groundRoad){
    const geo=mesh.geometry,pos=geo&&geo.attributes&&geo.attributes.position;
    if(!pos)continue;
    const idx=geo.index?geo.index.array:null,count=idx?idx.length:pos.count;
    for(let i=0;i+2<count;i+=3){
      const ia=idx?idx[i]:i,ib=idx?idx[i+1]:i+1,ic=idx?idx[i+2]:i+2;
      a.set(pos.getX(ia),pos.getY(ia),pos.getZ(ia));mesh.localToWorld(a);
      b.set(pos.getX(ib),pos.getY(ib),pos.getZ(ib));mesh.localToWorld(b);
      c.set(pos.getX(ic),pos.getY(ic),pos.getZ(ic));mesh.localToWorld(c);
      const abx=b.x-a.x,aby=b.y-a.y,abz=b.z-a.z,acx=c.x-a.x,acy=c.y-a.y,acz=c.z-a.z;
      const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx,nlen=Math.hypot(nx,ny,nz);
      if(nlen<0.0001||Math.abs(ny)/nlen<0.35)continue;
      const e1=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),e2=Math.hypot(b.x-c.x,b.y-c.y,b.z-c.z),e3=Math.hypot(c.x-a.x,c.y-a.y,c.z-a.z);
      if(Math.max(e1,e2,e3)>28)continue;
      const ax=px(a.x),ay=pz(a.z),bx=px(b.x),by=pz(b.z),cx=px(c.x),cy=pz(c.z);
      if(Math.max(ax,bx,cx)<0||Math.min(ax,bx,cx)>=roadMaskW||Math.max(ay,by,cy)<0||Math.min(ay,by,cy)>=roadMaskH)continue;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();ctx.fill();
      triangles++;
    }
  }
  const raw=ctx.getImageData(0,0,roadMaskW,roadMaskH).data;
  roadMaskData=new Uint8Array(roadMaskW*roadMaskH);
  for(let i=0,j=0;i<roadMaskData.length;i++,j+=4)roadMaskData[i]=raw[j]>80?1:0;
  console.info('Mapa do asfalto criado:',triangles,'triângulos');
}
function roadPixel(x,y){
  if(!roadMaskData||x<0||y<0||x>=roadMaskW||y>=roadMaskH)return false;
  return roadMaskData[y*roadMaskW+x]===1;
}
function roadAt(x,z){
  if(!roadMaskData){
    const p=project(x,z);return Math.abs(p.lat)<=CFG.roadHalf;
  }
  const px=Math.floor((x-ROAD_MIN_X)*ROAD_SCALE),py=Math.floor((ROAD_MAX_Z-z)*ROAD_SCALE);
  return roadPixel(px,py);
}
function nearestRoadPoint(x,z,maxPixels=90){
  if(!roadMaskData)return null;
  const px=Math.round((x-ROAD_MIN_X)*ROAD_SCALE),py=Math.round((ROAD_MAX_Z-z)*ROAD_SCALE);
  if(px<0||py<0||px>=roadMaskW||py>=roadMaskH)return null;
  for(let r=1;r<=maxPixels;r++){
    let bx=0,by=0,bd=Infinity;
    const test=(tx,ty)=>{
      if(!roadPixel(tx,ty))return;
      const d=(tx-px)*(tx-px)+(ty-py)*(ty-py);
      if(d<bd){bd=d;bx=tx;by=ty;}
    };
    for(let dx=-r;dx<=r;dx++){test(px+dx,py-r);test(px+dx,py+r);}
    for(let dy=-r+1;dy<r;dy++){test(px-r,py+dy);test(px+r,py+dy);}
    if(bd<Infinity)return {x:ROAD_MIN_X+(bx+0.5)/ROAD_SCALE,z:ROAD_MAX_Z-(by+0.5)/ROAD_SCALE};
  }
  return null;
}
function roadTangent(x,z,currentTh){
  let best=currentTh,bestScore=-Infinity;
  for(let i=0;i<72;i++){
    const a=i*Math.PI*2/72,fx=Math.sin(a),fz=Math.cos(a);
    const f=roadAt(x+fx*4.5,z+fz*4.5),b=roadAt(x-fx*4.5,z-fz*4.5);
    const score=(f&&b?5:(f||b?1:-2))-Math.abs(wrapPI(a-currentTh))*0.85;
    if(score>bestScore){bestScore=score;best=a;}
  }
  return best;
}
function buildProceduralTrack(){ // fallback: circuito gerado por código
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0x4f9a3f}));
  grass.rotation.x=-Math.PI/2;grass.position.set(0,-0.05,-160);grass.receiveShadow=true;grass.name='grass_1';scene.add(grass);groundOther.push(grass);
  const ring=(o1,o2,color,y,name)=>{const N=360,pos=[],idx=[];
    for(let i=0;i<=N;i++){const s=i/N*L,a=pathAt(s,o1),b=pathAt(s,o2);pos.push(a.x,y,a.z,b.x,y,b.z);if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide}));m.receiveShadow=true;m.name=name;scene.add(m);return m;};
  groundRoad.push(ring(-7.5,7.5,0x333338,0.02,'road'));
  ring(7.5,8.8,0xdd2222,0.03,'kerb');ring(-8.8,-7.5,0xeeeeee,0.03,'kerb');
  ring(10.6,11.4,0xb0b4bc,0.6,'barrier');ring(-11.4,-10.6,0xb0b4bc,0.6,'barrier');
  const sl=pathAt(TR.S0,0);const line=new THREE.Mesh(new THREE.PlaneGeometry(1.2,15),new THREE.MeshBasicMaterial({color:0xffffff}));
  line.rotation.x=-Math.PI/2;line.position.set(sl.x,0.05,sl.z);scene.add(line);
  for(let i=0;i<6;i++){const p=pathAt(60+i*40,-20);const b=new THREE.Mesh(new THREE.BoxGeometry(30,8,6),new THREE.MeshStandardMaterial({color:i%2?0xc8372d:0x2d5ec8}));b.position.set(p.x,4,p.z);scene.add(b);}
}

// ===== Karts e pilotos =====
function fallbackKart(color){
  const g=new THREE.Group(),M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.55,3.4),M(color));body.position.y=0.65;g.add(body);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.3,1.4),M(color));nose.position.set(0,0.5,2.2);g.add(nose);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.1,0.6),M(0x111111));wing.position.set(0,1.3,-1.9);g.add(wing);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.8,0.3),M(0x222222));seat.position.set(0,1.0,-0.6);g.add(seat);
  [[-1,1.4],[1,1.4],[-1,-1.3],[1,-1.3]].forEach(([x,z])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.55,16),M(0x151515));w.rotation.z=Math.PI/2;w.position.set(x*1.05,0.5,z);g.add(w);});
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;
}
function makeKartVisual(ki,color){
  const cfg=KARTS[ki],gl=assets[cfg.file],root=new THREE.Group(),rot=new THREE.Group();root.add(rot);
  if(gl){
    const m=SkeletonUtils.clone(gl.scene),holder=new THREE.Group();holder.add(m);
    const box=new THREE.Box3().setFromObject(holder),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    holder.position.set(-c.x,-box.min.y,-c.z);
    rot.scale.setScalar(CFG.kartLen/size.z);rot.rotation.y=cfg.rotY;rot.add(holder);
    holder.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }else rot.add(fallbackKart(color));
  return root;
}
function makePilot(pi,kcfg){ // piloto sentado: corpo cortado na altura do quadril por um plano de recorte
  const gl=assets[PILOTS[pi].file],holder=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const hipY=kcfg.seat[1];let mixer=null;
  if(gl){
    const m=SkeletonUtils.clone(gl.scene);holder.add(m);holder.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(holder,true);let h=box.max.y-box.min.y;
    let s=kcfg.H/(isFinite(h)&&h>0.01?h:1.8);
    const cx=(box.max.x+box.min.x)/2,cz=(box.max.z+box.min.z)/2;
    const by=isFinite(box.min.y)?box.min.y:0;
    holder.scale.setScalar(s);
    holder.position.set(kcfg.seat[0]-(isFinite(cx)?cx:0)*s,hipY-0.52*kcfg.H-by*s,kcfg.seat[2]-(isFinite(cz)?cz:0)*s);
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const cl=mats.map(mt=>{const c=mt.clone();c.clippingPlanes=[plane];c.side=THREE.DoubleSide;return c;});
      o.material=Array.isArray(o.material)?cl:cl[0];o.frustumCulled=false;}});
    if(gl.animations&&gl.animations.length){
      const clip=gl.animations[0].clone();clip.tracks=clip.tracks.filter(t=>!t.name.endsWith('.position'));
      mixer=new THREE.AnimationMixer(m);mixer.clipAction(clip).play();
    }
  }else{
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,4,8),new THREE.MeshStandardMaterial({color:0xffffff}));body.position.set(kcfg.seat[0],hipY+0.5,kcfg.seat[2]);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.3,12,12),new THREE.MeshStandardMaterial({color:0xe10600}));head.position.set(kcfg.seat[0],hipY+1.3,kcfg.seat[2]);
    holder.add(body,head);
  }
  return {holder,mixer,plane,hipY};
}
function createKart(ki,pi,isPlayer,idx){
  const color=isPlayer?'#e10600':AI_COLORS[idx%3];
  const root=makeKartVisual(ki,new THREE.Color(color));root.rotation.order='YXZ';
  const pilot=makePilot(pi,KARTS[ki]);root.add(pilot.holder);scene.add(root);
  return {root,pilot,isPlayer,color,ki,pi,idx,name:isPlayer?'Você':'Rival '+(idx+1),
    x:0,y:0,z:0,th:0,v:0,vx:0,vz:0,steer:0,slip:0,pitch:0,roll:0,
    drifting:false,dDir:0,dT:0,boostT:0,offroad:false,lane:0,aiMax:1,
    dist:0,sPrev:0,steerVisual:0,cpNext:0,laps:[],lapStart:0,best:Infinity,finished:false,finT:0,lastLap:0,autopilot:false,wall:0};
}

// ===== Corrida =====
function startRace(){
  $('menu').style.display='none';$('fin').style.display='none';$('hud').style.display='block';
  karts.forEach(k=>{scene.remove(k.root);});karts=[];
  const aiK=[(sel.kart+1)%3,(sel.kart+2)%3,sel.kart],aiP=[(sel.pilot+1)%2,sel.pilot,(sel.pilot+1)%2];
  for(let i=0;i<CFG.aiCount;i++){const k=createKart(aiK[i],aiP[i],false,i);k.aiMax=0.88+Math.random()*0.08;k.lane=[3.2,-3.2,3.2][i];karts.push(k);}
  player=createKart(sel.kart,sel.pilot,true,0);karts.push(player);
  // grid de largada (2 colunas) atrás da linha
  const slots=[[S0off(6),3.2],[S0off(6),-3.2],[S0off(18),3.2],[S0off(18),-3.2]];
  karts.forEach((k,i)=>{const sl=slots[i],p=pathAt(sl[0],sl[1]);k.x=p.x;k.z=p.z;k.th=p.th;k.y=0;
    k.sPrev=project(k.x,k.z).s;k.dist=0;k.lapCount=0;k.startedLap=false;k.cpPrevX=k.x;k.cpPrevZ=k.z;
    k.y=groundAt(k).y;k.root.position.set(k.x,k.y,k.z);k.root.rotation.y=k.th;});
  raceTime=0;cdTime=0;cdGo=0;goShown=0;state='countdown';
  karts.forEach(k=>k.s=project(k.x,k.z).s);camTh=player.th;updateCamera(0.016,true);
  $('lights').style.display='flex';[...document.querySelectorAll('.l')].forEach(l=>l.classList.remove('on'));$('go').style.display='none';
  $('bestTime').textContent='--:--.---';$('lastTime').textContent='--:--.---';$('msg').textContent='';
  if(!audio)initAudio();
}
const S0off=d=>TR.S0-d;
function placeGridPreview(){ // câmera de abertura sobre a reta de largada
  const p=pathAt(TR.S0-30,0);camera.position.set(p.x-25,14,p.z-30);camera.lookAt(p.x+40,1,p.z);
}

// ===== Física do veículo (arcade) =====
function updateVehiclePhysics(k,dt,inp){
  const f={x:Math.sin(k.th),z:Math.cos(k.th)};
  const off=checkOffroad(k);
  const boosting=k.boostT>0;if(boosting)k.boostT-=dt;
  // limite de velocidade conforme superfície / turbo
  let cap=CFG.maxV*(k.isPlayer?1:k.aiMax)*(boosting?1.25:1);
  if(off)cap=CFG.maxV*0.3;
  // aceleração / freio / ré
  if(inp.throttle>0){k.v+=(CFG.acc*(1-Math.pow(Math.max(k.v,0)/cap,2))*inp.throttle+(boosting?38:0))*dt;}
  else if(inp.brake>0){ const brakeForce=(!k.isPlayer?CFG.brake*0.82:CFG.brake); if(k.v>0.5)k.v-=brakeForce*inp.brake*dt; else k.v-=CFG.acc*0.6*dt; }
  // arraste + atrito de rolagem
  if(inp.throttle<=0){const d=(3+0.09*Math.abs(k.v))*dt;k.v-=Math.sign(k.v)*Math.min(Math.abs(k.v),d);}
  k.v=Math.max(k.v,-CFG.revMax);
  // penalidade off-road: queda drástica
  if(k.v>cap)k.v-=(k.v-cap)*Math.min(1,(off?7:2.2)*dt)+(off?25:0)*dt;
  if(k.v<-CFG.revMax)k.v=-CFG.revMax;
  // direção proporcional à velocidade
  k.steer+=(inp.steer-k.steer)* (1-Math.exp(-(k.isPlayer?5.2:3.8)*dt));
  const av=Math.abs(k.v),sf=clamp(av/8,0,1)*(1-0.28*clamp(av/CFG.maxV,0,1));
  const dir=k.v<-0.5?-1:1;
  // drift
  if(!k.drifting&&inp.drift&&Math.abs(k.steer)>0.35&&k.v>16&&!off){k.drifting=true;k.dDir=Math.sign(k.steer);k.dT=0;}
  let turn;
  if(k.drifting){
    k.dT+=dt;
    turn=(k.dDir*0.8+k.steer*0.6)*CFG.maxTurn*sf*1.05;
    k.v-=1.5*dt;
    if(!inp.drift||k.v<11||off){endDrift(k);}
  }else turn=k.steer*CFG.maxTurn*sf*dir;
  // estabilidade: suaviza a guinada conforme a velocidade, sem travar o volante
  turn*=1-0.18*clamp(av/CFG.maxV,0,1);
  k.th+=turn*dt;
  // derrapagem visual + aderência lateral reduzida
  k.slip+=((k.drifting?k.dDir*0.5:0)-k.slip)*Math.min(1,7*dt);
  const grip=k.drifting?2.9:13,tx=Math.sin(k.th)*k.v,tz=Math.cos(k.th)*k.v,a=1-Math.exp(-grip*dt);
  k.vx+=(tx-k.vx)*a;k.vz+=(tz-k.vz)*a;
  const prevX=k.x,prevZ=k.z;
  k.x+=k.vx*dt;k.z+=k.vz*dt;
  // Para NPCs, a borda do asfalto funciona como barreira física: não atravessam
  // a grama para cortar caminho. A colisão perde velocidade e mantém punição.
  if(!k.isPlayer&&!roadAt(k.x,k.z)){
    k.x=prevX;k.z=prevZ;k.vx*=-0.12;k.vz*=-0.12;k.v*=0.72;
    k.wall=Math.max(k.wall||0,0.45);k.penaltyT=(k.penaltyT||0)+0.5;
  }
  // Penalidade de pista: desacelera de forma forte fora do asfalto,
  // sem teletransportar o carro. Direção corretiva gradual para regressar.
  if(!roadAt(k.x,k.z)){
    k.offroad=true;
    k.v*=Math.max(0,1-4.2*dt);
    k.vx*=Math.max(0,1-3.4*dt);k.vz*=Math.max(0,1-3.4*dt);
    // Penalidade de tempo acumulada ao sair da pista.
    k.penaltyT=(k.penaltyT||0)+dt;
    const near=nearestRoadPoint(k.x,k.z,100);
    if(near){
      const aim=Math.atan2(near.x-k.x,near.z-k.z);
      const err=wrapPI(aim-k.th);
      k.th+=clamp(err,-1.2*dt,1.2*dt);
      k.wall=Math.max(k.wall,0.12);
    }
  }else k.offroad=false;
}
function endDrift(k){ // Mini-Turbo ao sair da derrapagem
  if(!k.drifting)return;k.drifting=false;
  const lvl=k.dT>1.6?2:k.dT>0.8?1:0;
  if(lvl>0)k.boostT=Math.max(k.boostT,lvl===2?1.4:0.85);
  k.dT=0;
}
// ===== Off-road: fora do asfalto (grama/zebra/terra) =====
function checkOffroad(k){
  const off=!roadAt(k.x,k.z);
  k.offroad=off;
  return off;
}
// ===== Altura do terreno + inclinação (pistas inclinadas) =====
function groundAt(k){
  _v.set(k.x,28,k.z);ray.set(_v,DOWN);
  let h=groundRoad.length?ray.intersectObjects(groundRoad,false):[];
  if(!h.length&&groundOther.length)h=ray.intersectObjects(groundOther,false);
  if(!h.length)return {y:k.y||0,n:null};
  _n.copy(h[0].face.normal);if(_n.y<0)_n.negate();
  return {y:h[0].point.y,n:_n.clone()};
}
// ===== Checkpoints invisíveis ordenados + voltas =====
const START_X=8.6,START_Z=-28.5,START_HALF_WIDTH=9.0;
function updateCheckpoints(k){
  const px=k.cpPrevX??k.x,pz=k.cpPrevZ??k.z;
  const dx=k.x-px,dz=k.z-pz;
  k.dist+=(Math.hypot(dx,dz));
  const crossed=px<START_X&&k.x>=START_X&&Math.abs((pz+k.z)*0.5-START_Z)<=START_HALF_WIDTH;
  if(crossed&&!k.finished){
    if(!k.startedLap){
      k.startedLap=true;k.lapStart=raceTime;
    }else{
      const lt=raceTime-k.lapStart;k.laps.push(lt);k.lastLap=lt;
      if(lt<k.best)k.best=lt;
      if(k.isPlayer){
        $('lastTime').textContent=fmt(lt);
        if(lt<=k.best){$('bestTime').textContent=fmt(k.best);flash('NOVA MELHOR VOLTA!');}
      }
      k.lapCount=(k.lapCount||0)+1;k.lapStart=raceTime;
      if(k.lapCount>=CFG.laps){
        k.finished=true;k.finT=raceTime;if(k.isPlayer)onPlayerFinish();
      }
    }
  }
  k.cpPrevX=k.x;k.cpPrevZ=k.z;
}
function flash(t){const m=$('msg');m.textContent=t;clearTimeout(flash.t);flash.t=setTimeout(()=>m.textContent='',1800);}
const fmt=t=>{if(!isFinite(t))return '--:--.---';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(3);};
function ranking(){return [...karts].sort((a,b)=>(b.finished?1e6-b.finT:(b.lapCount||0)*10000+b.dist)-(a.finished?1e6-a.finT:(a.lapCount||0)*10000+a.dist));}
function onPlayerFinish(){
  player.autopilot=true;
  setTimeout(()=>{
    const rk=ranking(),pos=rk.indexOf(player)+1;
    $('finPos').textContent='P'+pos+(pos===1?'  🏆 VITÓRIA!':'');
    $('finTitle').innerHTML=pos===1?'VOCÊ <span>VENCEU!</span>':'CORRIDA <span>FINALIZADA</span>';
    let h='<tr><td>Tempo total</td><td class="orb">'+fmt(player.finT)+'</td></tr><tr><td>Melhor volta</td><td class="orb">'+fmt(player.best)+'</td></tr>';
    player.laps.forEach((l,i)=>h+='<tr><td>Volta '+(i+1)+'</td><td class="orb">'+fmt(l)+'</td></tr>');
    $('finTable').innerHTML=h;$('hud').style.display='none';$('fin').style.display='flex';state='finished';
  },1800);
}

// ===== IA dos rivais (e piloto automático após a bandeirada) =====
function aiInput(k){
  const clampLocal=(v,a,b)=>Math.max(a,Math.min(b,v));
  const speed=Math.abs(k.v), opponents=karts.filter(o=>o!==k&&!o.finished);
  // A IA não escolhe um destino em linha reta: avalia várias curvas possíveis
  // e elimina qualquer manobra que ponha o corpo do carro fora do asfalto.
  if(!roadAt(k.x,k.z)){
    const near=nearestRoadPoint(k.x,k.z,240);
    if(!near)return {throttle:0,brake:1,steer:0,drift:false};
    const err=wrapPI(Math.atan2(near.x-k.x,near.z-k.z)-k.th);
    return {throttle:0,brake:1,steer:clampLocal(err*1.6,-0.7,0.7),drift:false};
  }
  // Probe o asfalto à frente para saber quando a pista realmente vira.
  const look=clampLocal(12+speed*0.60,16,38), step=1.5;
  let best=null,bestScore=-1e9;
  for(let steer=-1;steer<=1.001;steer+=0.025){
    let x=k.x,z=k.z,th=k.th,valid=true,score=0,minMargin=99;
    for(let d=step;d<=look;d+=step){
      const v=Math.max(5,speed);
      const turn=steer*CFG.maxTurn*clampLocal(v/11,0.28,1)*0.88;
      th+=turn*(step/v);
      x+=Math.sin(th)*step; z+=Math.cos(th)*step;
      if(!roadAt(x,z)){valid=false;break;}
      // Verifica a largura ocupada pelo veículo, não só o ponto central.
      const nx=Math.cos(th),nz=-Math.sin(th);
      let inside=0;
      for(const side of [-2.1,-1.4,-0.7,0,0.7,1.4,2.1])
        if(roadAt(x+nx*side,z+nz*side))inside++;
      minMargin=Math.min(minMargin,inside);
      if(inside<7)score-= (7-inside)*7;
      else score+=2.5;
      // O alinhamento com a direção local da estrada vale mais adiante.
      if(d>look*0.35){
        const tangent=roadTangent(x,z,th);
        score-=Math.abs(wrapPI(tangent-th))*(1.4+d/look*2.8);
      }
      // Mantém distância real de colisão dos adversários.
      for(const o of opponents){
        const dx=x-o.x,dz=z-o.z,dist=Math.hypot(dx,dz);
        if(dist<4.4)score-=((4.4-dist)**2)*3;
      }
    }
    if(!valid)continue;
    score+=look*0.3-Math.abs(steer)*1.4-Math.abs(steer-k.steer)*1.0;
    if(minMargin<7)score-=12;
    if(score>bestScore){bestScore=score;best={steer,score};}
  }
  if(!best){
    const tangent=roadTangent(k.x,k.z,k.th),err=wrapPI(tangent-k.th);
    return {throttle:0,brake:1,steer:clampLocal(err*1.3,-0.6,0.6),drift:false};
  }
  let steer=best.steer;
  // Ultrapassagem apenas se houver corredor de asfalto por todo o movimento.
  let passing=false;
  for(const o of opponents){
    const dx=o.x-k.x,dz=o.z-k.z;
    const forward=dx*Math.sin(k.th)+dz*Math.cos(k.th);
    const lateral=dx*Math.cos(k.th)-dz*Math.sin(k.th);
    if(forward>1.5&&forward<15&&Math.abs(lateral)<3.8){
      let bestSide=0,bestSideScore=-1e9;
      for(const side of [-1,1]){
        let safe=true,clear=0;
        for(const d of [3,5,7,9,12,15]){
          const px=k.x+Math.sin(k.th)*d+Math.cos(k.th)*side*3.1;
          const pz=k.z+Math.cos(k.th)*d-Math.sin(k.th)*side*3.1;
          if(!roadAt(px,pz)){safe=false;break;}
          let crowded=false;
          for(const q of opponents){if(q===o)continue;if(Math.hypot(px-q.x,pz-q.z)<4.2){crowded=true;break;}}
          if(crowded){safe=false;break;} clear++;
        }
        if(safe&&clear>bestSideScore){bestSide=side;bestSideScore=clear;}
      }
      if(bestSide){steer=clampLocal(steer+bestSide*0.22,-1,1);passing=true;}
      break;
    }
  }
  // Freia com antecedência: estima a mudança de tangente em vários pontos reais.
  let curvature=0;
  for(const d of [5,9,14,20,27]){
    const px=k.x+Math.sin(k.th)*d,pz=k.z+Math.cos(k.th)*d;
    if(!roadAt(px,pz)){curvature=Math.max(curvature,1.25);continue;}
    const tangent=roadTangent(px,pz,k.th);
    curvature=Math.max(curvature,Math.abs(wrapPI(tangent-k.th))*16/d);
  }
  const maxAllowed=CFG.maxV*(k.aiMax||0.78);
  const safeSpeed=maxAllowed*clampLocal(1-curvature*0.42,0.28,1)*(passing?0.94:1);
  const throttle=k.v<safeSpeed-1.0?1:0;
  const brake=k.v>safeSpeed?clampLocal((k.v-safeSpeed)*0.45,0.22,1):0;
  return {throttle,brake,steer,drift:false};
}
function playerInput(){
  const up=keys.KeyW||keys.ArrowUp,dn=keys.KeyS||keys.ArrowDown,l=keys.KeyA||keys.ArrowLeft,r=keys.KeyD||keys.ArrowRight;
  return {throttle:up?1:0,brake:dn?1:0,steer:(l?1:0)-(r?1:0),drift:!!(keys.Space||keys.ShiftLeft||keys.ShiftRight)};
}
function separateKarts(){
  for(let i=0;i<karts.length;i++)for(let j=i+1;j<karts.length;j++){
    const a=karts[i],b=karts[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=2.3;
    if(d<min&&d>0.001){const push=(min-d)/2,nx=dx/d,nz=dz/d;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;
      const rel=(a.v-b.v)*0.08;a.v-=rel;b.v+=rel;}
  }
}

// ===== Partículas (faíscas de drift / turbo) =====
function makeParticles(){
  const N=140,pos=new Float32Array(N*3),col=new Float32Array(N*3),life=new Float32Array(N),vel=new Float32Array(N*3);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:0.55,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  pts.frustumCulled=false;return {points:pts,pos,col,life,vel,N,i:0};
}
function emit(x,y,z,c){const P=particles,i=P.i=(P.i+1)%P.N;P.pos.set([x,y,z],i*3);P.col.set(c,i*3);P.life[i]=0.5;
  P.vel.set([(Math.random()-.5)*5,2+Math.random()*3,(Math.random()-.5)*5],i*3);}
function updateParticles(dt){
  const P=particles;for(let i=0;i<P.N;i++){if(P.life[i]>0){P.life[i]-=dt;P.vel[i*3+1]-=12*dt;
    for(let a=0;a<3;a++)P.pos[i*3+a]+=P.vel[i*3+a]*dt;const f=Math.max(P.life[i]*2,0);
    if(P.life[i]<=0){P.pos[i*3+1]=-999;}else{P.col[i*3]*=1;}}else P.pos[i*3+1]=-999;}
  P.points.geometry.attributes.position.needsUpdate=true;P.points.geometry.attributes.color.needsUpdate=true;
}

// ===== Câmera 3ª pessoa com lerp + FOV dinâmico =====
const camTarget=new THREE.Vector3(),camLook=new THREE.Vector3();let camTh=0;
function updateCamera(dt,snap){
  const k=player;camTh+=wrapPI(k.th+k.slip*0.35-camTh)*(snap?1:1-Math.exp(-5*dt));
  const back=9.5,up=4.3;
  camTarget.set(k.x-Math.sin(camTh)*back,k.y+up,k.z-Math.cos(camTh)*back);
  if(snap)camera.position.copy(camTarget);else camera.position.lerp(camTarget,1-Math.exp(-8*dt));
  camLook.set(k.x+Math.sin(camTh)*6,k.y+1.4,k.z+Math.cos(camTh)*6);camera.lookAt(camLook);
  const sp=clamp(Math.abs(k.v)/CFG.maxV,0,1.3),fovT=60+Math.pow(sp,2)*26+(k.boostT>0?6:0);
  camera.fov+=(fovT-camera.fov)*Math.min(1,3*dt);camera.updateProjectionMatrix();
}

// ===== HUD =====
const gctx=$('gauge').getContext('2d'),mctx=$('mini').getContext('2d');
function drawGauge(kmh){
  const c=gctx,W=460,cx=230,cy=230,r=190;c.clearRect(0,0,W,W);
  c.beginPath();c.arc(cx,cy,215,0,7);c.fillStyle='rgba(10,12,18,.7)';c.fill();
  const a0=Math.PI*0.75,span=Math.PI*1.5,max=240;
  c.lineWidth=14;c.lineCap='round';c.strokeStyle='rgba(255,255,255,.12)';c.beginPath();c.arc(cx,cy,r,a0,a0+span);c.stroke();
  const f=clamp(kmh/max,0,1);c.strokeStyle=f>0.85?'#ff3b30':'#e10600';c.beginPath();c.arc(cx,cy,r,a0,a0+span*f);c.stroke();
  c.lineWidth=3;c.strokeStyle='#cfd5df';c.fillStyle='#98a2b3';c.font='bold 22px Rajdhani,sans-serif';c.textAlign='center';c.textBaseline='middle';
  for(let v=0;v<=max;v+=20){const a=a0+span*v/max;c.beginPath();c.moveTo(cx+Math.cos(a)*(r-22),cy+Math.sin(a)*(r-22));c.lineTo(cx+Math.cos(a)*(r-36),cy+Math.sin(a)*(r-36));c.stroke();c.fillText(v,cx+Math.cos(a)*(r-58),cy+Math.sin(a)*(r-58));}
  const a=a0+span*f;c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*(r-18),cy+Math.sin(a)*(r-18));c.stroke();
  c.fillStyle='#e10600';c.beginPath();c.arc(cx,cy,10,0,7);c.fill();
}
const miniPts=[];for(let i=0;i<120;i++)miniPts.push(pathAt(i/120*L,0));
function drawMini(){
  const c=mctx,W=180,H=104;
  c.clearRect(0,0,W,H);
  const sx=Math.min((W-20)/(ROAD_MAX_X-ROAD_MIN_X),(H-16)/(ROAD_MAX_Z-ROAD_MIN_Z));
  const dw=(ROAD_MAX_X-ROAD_MIN_X)*sx,dh=(ROAD_MAX_Z-ROAD_MIN_Z)*sx;
  const ox=(W-dw)/2,oy=(H-dh)/2;
  if(roadMaskCanvas){c.globalAlpha=0.32;c.drawImage(roadMaskCanvas,ox,oy,dw,dh);c.globalAlpha=1;}
  const X=x=>ox+(x-ROAD_MIN_X)*sx,Z=z=>oy+(ROAD_MAX_Z-z)*sx;
  karts.forEach(k=>{c.fillStyle=k.isPlayer?'#fff':k.color;c.beginPath();c.arc(X(k.x),Z(k.z),k.isPlayer?4.5:3,0,Math.PI*2);c.fill();if(k.isPlayer){c.strokeStyle='#e10600';c.lineWidth=2;c.stroke();}});
}
function updateHUD(){
  const kmh=Math.abs(player.v)*3.6;drawGauge(kmh);$('kmh').textContent=Math.round(kmh);
  const lap=clamp((player.lapCount||0)+1,1,CFG.laps);$('lapbig').textContent=lap+'/'+CFG.laps;
  $('pos').innerHTML=(ranking().indexOf(player)+1)+'<small>/'+karts.length+'</small>';
  $('lapTime').textContent=state==='racing'&&!player.finished&&player.startedLap?fmt(raceTime-player.lapStart):'0:00.000';
  const bf=$('boostf'),lv=player.drifting?clamp(player.dT/1.6,0,1):(player.boostT>0?clamp(player.boostT/1.4,0,1):0);
  bf.style.width=lv*100+'%';bf.style.background=player.boostT>0?'#ff9d1a':(player.dT>1.6?'#ff9d1a':player.dT>0.8?'#3aa0ff':'#6b7a90');
  drawMini();
}
function updateLights(dt){
  if(state==='countdown'){
    cdTime+=dt;const on=clamp(Math.floor((cdTime-0.8)/0.8)+1,0,5),L5=[...document.querySelectorAll('.l')];
    L5.forEach((l,i)=>l.classList.toggle('on',i<on&&cdGo===0));
    if(on>=5&&!cdGo)cdGo=cdTime+0.6+Math.random()*0.9;
    if(cdGo&&cdTime>=cdGo){state='racing';raceTime=0;L5.forEach(l=>l.classList.remove('on'));$('go').style.display='block';goShown=1.4;}
  }
  if(goShown>0){goShown-=dt;if(goShown<=0){$('go').style.display='none';$('lights').style.display='none';}}
}

// ===== Áudio simples do motor =====
function initAudio(){
  try{
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    const master=ac.createGain();master.gain.value=0.52;master.connect(ac.destination);
    const makeVoice=(type,freq,gain,filterFreq)=>{const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
      o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=filterFreq;g.gain.value=gain;o.connect(f);f.connect(g);g.connect(master);o.start();return {o,g,f};};
    // Camadas sintéticas: tom principal, harmônico e pulsação grave. O timbre muda entre kart e F1.
    const main=makeVoice('sawtooth',75,0.11,1200),harm=makeVoice('square',150,0.035,1800),low=makeVoice('triangle',38,0.09,260);
    const tire=makeVoice('sawtooth',900,0.0001,500);
    audio={ac,master,main,harm,low,tire};
    const resume=()=>{if(ac.state==='suspended')ac.resume();window.removeEventListener('keydown',resume);window.removeEventListener('pointerdown',resume);};
    window.addEventListener('keydown',resume);window.addEventListener('pointerdown',resume);
  }catch(e){audio=null;}
}

// ===== Menu =====
function buildMenu(){
  const mk=(id,arr,key)=>{const w=$(id);arr.forEach((a,i)=>{const d=document.createElement('div');d.className='card'+(i===sel[key]?' sel':'');d.innerHTML=a.name+'<small>'+a.sub+'</small>';
    d.onclick=()=>{sel[key]=i;[...w.children].forEach((c,j)=>c.classList.toggle('sel',j===i));};w.appendChild(d);});};
  mk('kartCards',KARTS,'kart');mk('pilotCards',PILOTS,'pilot');
}

// ===== Loop principal =====
const _m=new THREE.Matrix4();
function animate(t){
  requestAnimationFrame(animate);
  const dt=Math.min((t-lastT)/1000||0.016,0.05);lastT=t;
  if(state==='menu'||!player){renderer.render(scene,camera);return;}
  updateLights(dt);
  const racing=state==='racing'||state==='finished';
  for(const k of karts){
    k.s=project(k.x,k.z).s;
    let inp={throttle:0,brake:0,steer:0,drift:false};
    if(racing){inp=(k.isPlayer&&!k.autopilot)?playerInput():aiInput(k);}
    else if(state==='countdown'&&!k.isPlayer){}
    if(racing||state==='countdown'){ if(state==='countdown'){k.v=0;k.vx=k.vz=0;} else updateVehiclePhysics(k,dt,inp); }
    k.wall=Math.max(0,k.wall-dt);
    k.s=project(k.x,k.z).s;
    if(state!=='countdown')updateCheckpoints(k);
  }
  if(racing){separateKarts();raceTime+=dt;}
  // atualiza visuais (terreno, inclinação, piloto)
  for(const k of karts){
    const g=groundAt(k);k.y+=(g.y-k.y)*Math.min(1,18*dt);
    if(g.n){const fx=Math.sin(k.th),fz=Math.cos(k.th),lx=Math.cos(k.th),lz=-Math.sin(k.th);
      const nf=g.n.x*fx+g.n.z*fz,nl=g.n.x*lx+g.n.z*lz;
      k.pitch+=(Math.atan2(nf,g.n.y)-k.pitch)*Math.min(1,8*dt);k.roll+=(-Math.atan2(nl,g.n.y)-k.roll)*Math.min(1,8*dt);}
    k.root.position.set(k.x,k.y,k.z);
    k.root.rotation.set(k.pitch,k.th+k.slip,k.roll+(k.drifting?-k.dDir*0.04:0));
    // plano de recorte do piloto (quadril)
    k.pilot.plane.constant=-(k.y+k.pilot.hipY-0.02);
    if(k.pilot.mixer)k.pilot.mixer.update(dt);
    // faíscas
    if(k.drifting||k.boostT>0){const c=k.boostT>0?[1,0.55,0.1]:(k.dT>1.6?[1,0.6,0.1]:k.dT>0.8?[0.3,0.65,1]:[1,1,0.8]);
      for(let s=-1;s<=1;s+=2){const lx=Math.cos(k.th)*0.9*s,lz=-Math.sin(k.th)*0.9*s;emit(k.x-Math.sin(k.th)*1.8+lx,k.y+0.3,k.z-Math.cos(k.th)*1.8+lz,c);}}
  }
  updateParticles(dt);
  updateCamera(dt,false);
  // sol e sombras seguem o jogador
  sun.position.set(player.x+55,player.y+85,player.z+35);sun.target.position.set(player.x,player.y,player.z);
  skyDome.position.copy(camera.position);
  if(audio&&player){const sp=clamp(Math.abs(player.v)/CFG.maxV,0,1.35),f1=player.ki===0?0:player.ki===1?0:1;
    const base=player.ki===0?48:player.ki===1?62:92;
    const rpm=base+sp*(player.ki===2?330:205)+(player.boostT>0?35:0);
    const now=audio.ac.currentTime,muted=state==='finished'?0:1;
    audio.main.o.frequency.setTargetAtTime(rpm,now,0.055);audio.harm.o.frequency.setTargetAtTime(rpm*2.03,now,0.06);
    audio.low.o.frequency.setTargetAtTime(rpm*0.48,now,0.07);
    audio.main.f.frequency.setTargetAtTime((player.ki===2?850:1250)+sp*1700,now,0.08);
    audio.harm.g.gain.setTargetAtTime((player.ki===2?0.045:0.025)*muted,now,0.08);
    audio.main.g.gain.setTargetAtTime((player.ki===2?0.14:0.10)*muted,now,0.08);audio.low.g.gain.setTargetAtTime(0.075*muted,now,0.08);
    audio.tire.g.gain.setTargetAtTime((player.drifting?0.025:player.offroad?0.012:0.0001)*muted,now,0.04);
    audio.tire.o.frequency.setTargetAtTime(650+sp*450,now,0.08);
  }
  updateHUD();
  renderer.render(scene,camera);
}

init();
