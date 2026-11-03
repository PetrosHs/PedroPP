
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
function showErr(m){const l=document.getElementById('loading');if(l){l.style.display='flex';const h=l.querySelector('h2');if(h){h.style.color='#ff6b6b';h.textContent='ERRO: '+m;}}console.error(m);}
window.addEventListener('error',e=>showErr(e.message+' ('+(e.lineno||'?')+')'));window.addEventListener('unhandledrejection',e=>showErr(String(e.reason&&e.reason.message||e.reason)));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPI=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};

/*MATH_START*/
// ===== Geometria do circuito oval (estádio): 2 retas + 2 semicírculos. Sentido anti-horário (curvas à esquerda) =====
const TR={cx:150,R:132.25,cz:-160.75,zb:-28.5,zt:-293,S0:158.6};
const LS=300, LC=Math.PI*TR.R, L=2*LS+2*LC;
// Projeta (x,z) na linha central: s = distância ao longo do traçado; lat = deslocamento lateral (+ = esquerda)
function projectOval(x,z){
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
function pathAtOval(s,off=0){
  s=((s%L)+L)%L;let x,z,th;
  if(s<LS){x=s-TR.cx;z=TR.zb-off;th=Math.PI/2;}
  else if(s<LS+LC){const a=(s-LS)/TR.R,phi=Math.PI/2-a,r=TR.R-off;x=TR.cx+r*Math.cos(phi);z=TR.cz+r*Math.sin(phi);th=Math.PI/2+a;}
  else if(s<2*LS+LC){const u=s-LS-LC;x=TR.cx-u;z=TR.zt+off;th=1.5*Math.PI;}
  else{const a=(s-2*LS-LC)/TR.R,phi=1.5*Math.PI-a,r=TR.R-off;x=-TR.cx+r*Math.cos(phi);z=TR.cz+r*Math.sin(phi);th=1.5*Math.PI+a;}
  return {x,z,th};
}
/*MATH_END*/
/*ROUTE_START*/
// ===== Traçado oficial (a volta que você desenhou): único caminho válido =====
const ROUTE_RAW=[[9.5,-30.2,9.5],[13.5,-30.2,9.5],[17.5,-30.2,9.5],[21.5,-30.2,9.5],[25.5,-30.2,9.5],[29.5,-30.2,9.5],[33.5,-30.2,9.5],[37.5,-30.2,9.5],[41.5,-30.2,9.5],[45.5,-30.2,9.5],[49.5,-30.2,9.5],[53.5,-30.2,9.5],[57.5,-30.2,9.5],[61.5,-30.2,9.5],[65.5,-30.2,9.5],[69.5,-30.2,9.5],[73.5,-30.2,9.5],[77.5,-30.2,9.5],[81.5,-30.2,9.5],[85.5,-30.2,9.5],[89.5,-30.0,9.5],[93.5,-29.8,9.5],[97.4,-29.1,9.5],[101.2,-28.0,9.5],[105.0,-26.7,9.0],[108.8,-25.9,9.3],[112.7,-25.8,9.4],[116.6,-26.4,9.5],[120.5,-27.1,9.5],[124.4,-27.7,9.5],[128.4,-28.0,9.5],[132.4,-28.1,9.5],[136.4,-28.1,9.5],[140.4,-28.1,9.5],[144.4,-28.1,9.5],[148.4,-28.2,9.5],[152.4,-28.4,9.5],[156.4,-28.6,9.5],[160.4,-29.0,9.5],[164.4,-29.4,9.5],[168.4,-29.9,9.5],[172.3,-30.5,9.5],[176.3,-31.2,9.5],[180.2,-32.1,9.5],[184.0,-33.1,9.5],[187.9,-34.1,9.5],[191.7,-35.3,9.5],[195.5,-36.7,9.5],[199.2,-38.1,9.5],[202.9,-39.7,9.5],[206.5,-41.4,9.5],[210.1,-43.2,9.5],[213.6,-45.1,9.5],[217.1,-47.1,9.5],[220.5,-49.2,9.5],[223.8,-51.4,9.5],[227.1,-53.7,9.5],[230.3,-56.1,9.5],[233.5,-58.6,9.5],[236.5,-61.1,9.5],[239.5,-63.8,9.5],[242.4,-66.5,9.5],[245.2,-69.4,9.5],[247.9,-72.3,9.5],[250.5,-75.4,9.5],[253.1,-78.5,9.5],[255.5,-81.6,9.5],[257.8,-84.9,9.5],[260.0,-88.2,9.5],[262.2,-91.6,9.5],[264.2,-95.1,9.5],[266.1,-98.6,9.5],[268.0,-102.1,9.5],[269.7,-105.7,9.5],[271.3,-109.4,9.5],[272.8,-113.1,9.5],[274.1,-116.9,9.5],[275.4,-120.7,9.5],[276.6,-124.5,9.5],[277.6,-128.4,9.5],[278.6,-132.2,9.5],[279.4,-136.2,9.5],[280.1,-140.1,9.5],[280.6,-144.1,9.5],[281.1,-148.0,9.5],[281.4,-152.0,9.5],[281.6,-156.0,9.5],[281.7,-160.0,9.5],[281.6,-164.0,9.5],[281.4,-168.0,9.5],[281.1,-172.0,9.5],[280.7,-176.0,9.5],[280.2,-180.0,9.5],[279.5,-183.9,9.5],[278.7,-187.8,9.5],[277.8,-191.7,9.5],[276.7,-195.6,9.5],[275.6,-199.4,9.5],[274.3,-203.2,9.5],[273.0,-207.0,9.5],[271.5,-210.7,9.5],[269.9,-214.4,9.5],[268.2,-218.0,9.5],[266.4,-221.6,9.5],[264.5,-225.1,9.5],[262.5,-228.5,9.5],[260.3,-231.9,9.5],[258.1,-235.2,9.5],[255.7,-238.5,9.5],[253.3,-241.6,9.5],[250.8,-244.8,9.5],[248.2,-247.8,9.5],[245.5,-250.8,9.5],[242.7,-253.6,9.5],[239.8,-256.4,9.5],[236.9,-259.1,9.5],[233.8,-261.6,9.5],[230.7,-264.1,9.5],[227.5,-266.6,9.5],[224.2,-268.9,9.5],[220.9,-271.1,9.5],[217.5,-273.3,9.5],[214.1,-275.3,9.5],[210.6,-277.2,9.5],[207.0,-279.0,9.5],[203.4,-280.7,9.5],[199.7,-282.3,9.5],[196.0,-283.8,9.5],[192.2,-285.1,9.5],[188.4,-286.3,9.5],[184.6,-287.4,9.5],[180.7,-288.4,9.5],[176.8,-289.3,9.5],[172.8,-290.0,9.5],[168.9,-290.6,9.5],[164.9,-291.1,9.5],[160.9,-291.5,9.5],[156.9,-291.7,9.5],[152.9,-291.9,9.5],[148.9,-292.0,9.5],[144.9,-292.0,9.5],[140.9,-292.1,9.5],[136.9,-292.1,9.5],[132.9,-292.1,9.5],[128.9,-291.8,9.5],[125.0,-291.2,9.5],[121.2,-290.1,9.5],[117.8,-288.3,9.4],[114.7,-285.8,9.2],[112.0,-282.9,9.0],[109.5,-279.9,8.7],[106.9,-276.8,8.4],[104.2,-273.9,8.2],[101.3,-271.0,8.1],[98.4,-268.3,8.1],[95.4,-265.7,8.1],[92.4,-263.1,8.1],[89.3,-260.5,8.1],[86.2,-258.0,8.1],[83.0,-255.6,8.1],[79.6,-253.5,8.1],[76.0,-251.8,8.1],[72.2,-250.7,8.1],[68.3,-250.1,8.1],[64.3,-249.9,8.1],[60.3,-249.9,8.0],[56.3,-249.9,8.0],[52.3,-250.0,8.0],[48.3,-250.0,8.0],[44.3,-250.0,8.0],[40.3,-250.0,8.0],[36.3,-250.0,8.0],[32.3,-250.0,8.0],[28.3,-250.0,8.0],[24.3,-250.0,8.0],[20.3,-250.0,8.0],[16.3,-250.0,8.0],[12.3,-250.0,8.0],[8.3,-250.0,8.0],[4.3,-250.0,8.0],[0.3,-250.0,8.0],[-3.7,-250.0,8.0],[-7.7,-250.0,8.0],[-11.7,-250.0,8.0],[-15.7,-250.0,8.0],[-19.7,-250.0,8.0],[-23.7,-250.0,8.0],[-27.7,-250.0,8.0],[-31.7,-250.0,8.0],[-35.7,-250.0,8.0],[-39.7,-250.0,8.0],[-43.7,-250.0,8.0],[-47.7,-250.0,8.0],[-51.7,-250.0,8.0],[-55.7,-250.0,8.0],[-59.8,-250.0,8.0],[-63.8,-250.0,8.0],[-67.8,-250.0,8.0],[-71.8,-250.0,8.0],[-75.8,-250.0,8.0],[-79.8,-250.0,8.0],[-83.8,-250.0,8.0],[-87.8,-250.0,8.0],[-91.8,-250.0,8.0],[-95.8,-250.0,8.0],[-99.8,-250.0,8.0],[-103.8,-250.0,8.0],[-107.8,-250.0,8.0],[-111.8,-250.0,8.1],[-115.8,-250.0,8.1],[-119.8,-249.9,8.2],[-123.8,-249.8,8.2],[-127.7,-249.4,8.2],[-131.6,-248.5,8.1],[-135.0,-246.8,8.0],[-137.6,-244.1,8.1],[-139.4,-240.7,8.1],[-140.4,-236.9,8.2],[-140.9,-232.9,8.3],[-141.2,-228.9,8.3],[-141.3,-224.9,8.3],[-141.4,-220.9,8.2],[-141.3,-216.9,8.2],[-141.2,-212.9,8.1],[-141.1,-208.9,8.0],[-141.1,-204.9,8.0],[-141.0,-200.9,7.9],[-141.0,-196.9,7.9],[-140.9,-192.9,7.9],[-140.8,-188.9,7.8],[-140.6,-184.9,7.8],[-140.3,-181.0,7.8],[-139.6,-177.1,7.7],[-138.4,-173.4,7.6],[-136.5,-170.1,7.5],[-134.0,-167.0,7.3],[-131.2,-164.1,7.1],[-128.4,-161.3,6.9],[-125.5,-158.6,6.6],[-122.5,-155.9,6.4],[-119.5,-153.2,6.1],[-116.5,-150.6,5.9],[-113.4,-148.0,5.6],[-110.3,-145.5,5.4],[-107.1,-143.1,5.3],[-103.8,-140.9,5.1],[-100.3,-138.9,5.0],[-96.7,-137.3,5.0],[-92.9,-136.1,5.0],[-89.0,-135.3,5.0],[-85.0,-135.1,5.1],[-81.1,-135.3,5.3],[-77.2,-135.9,5.5],[-73.3,-137.0,5.8],[-69.7,-138.6,5.9],[-66.5,-140.8,6.0],[-63.8,-143.6,5.9],[-61.7,-146.9,5.8],[-60.1,-150.6,5.6],[-58.9,-154.4,5.5],[-58.0,-158.3,5.4],[-57.2,-162.2,5.3],[-56.6,-166.1,5.3],[-56.1,-170.1,5.3],[-55.5,-174.1,5.3],[-54.7,-178.0,5.2],[-53.6,-181.8,5.1],[-52.1,-185.5,5.0],[-50.3,-189.0,5.0],[-48.0,-192.3,5.0],[-45.4,-195.3,5.0],[-42.5,-197.9,5.0],[-39.2,-200.2,5.0],[-35.7,-202.1,5.0],[-32.0,-203.6,5.0],[-28.2,-204.8,5.2],[-24.3,-205.6,5.3],[-20.4,-206.2,5.3],[-16.4,-206.6,5.4],[-12.4,-206.8,5.4],[-8.4,-206.9,5.4],[-4.4,-207.0,5.4],[-0.4,-207.0,5.5],[3.6,-207.0,5.5],[7.6,-207.0,5.5],[11.6,-207.0,5.5],[15.6,-207.0,5.5],[19.6,-207.0,5.5],[23.6,-207.0,5.5],[27.6,-207.0,5.5],[31.6,-207.0,5.5],[35.6,-207.0,5.5],[39.6,-207.0,5.5],[43.6,-207.0,5.5],[47.6,-207.0,5.5],[51.6,-207.0,5.5],[55.7,-207.0,5.5],[59.7,-207.1,5.4],[63.7,-207.1,5.4],[67.7,-207.3,5.4],[71.6,-207.5,5.5],[75.6,-208.0,5.6],[79.5,-208.7,5.8],[83.4,-209.9,6.3],[87.1,-211.3,6.8],[90.7,-212.9,7.3],[94.4,-214.6,7.4],[98.0,-216.3,7.1],[101.5,-218.2,6.6],[104.8,-220.4,6.1],[107.9,-223.0,5.7],[110.8,-225.7,5.5],[113.7,-228.5,5.4],[116.6,-231.2,5.3],[119.5,-233.9,5.3],[122.7,-236.4,5.2],[125.9,-238.7,5.2],[129.4,-240.7,5.1],[133.0,-242.4,5.1],[136.7,-243.7,5.1],[140.6,-244.6,5.1],[144.6,-245.1,5.1],[148.5,-245.3,5.1],[152.5,-245.0,5.1],[156.4,-244.3,5.1],[160.3,-243.2,5.1],[163.9,-241.7,5.1],[167.5,-239.8,5.0],[170.7,-237.6,5.0],[173.8,-235.1,5.0],[176.6,-232.2,5.0],[179.1,-229.1,5.0],[181.2,-225.8,5.0],[183.0,-222.2,5.1],[184.5,-218.5,5.2],[185.6,-214.7,5.3],[186.3,-210.8,5.5],[186.6,-206.8,5.6],[186.5,-202.8,5.7],[186.0,-198.9,5.8],[185.3,-194.9,5.8],[184.2,-191.1,5.8],[183.0,-187.3,5.8],[181.6,-183.5,5.8],[180.1,-179.8,5.8],[178.5,-176.2,5.8],[176.9,-172.5,5.8],[175.2,-168.8,5.8],[173.7,-165.2,5.8],[172.1,-161.5,5.9],[170.6,-157.8,6.0],[169.0,-154.1,6.1],[167.5,-150.4,6.2],[165.9,-146.7,6.3],[164.4,-143.0,6.4],[162.9,-139.3,6.5],[161.3,-135.6,6.6],[159.8,-131.9,6.7],[158.2,-128.2,6.8],[156.7,-124.5,6.9],[155.2,-120.8,7.0],[153.6,-117.1,7.1],[152.1,-113.4,7.2],[150.5,-109.8,7.3],[148.8,-106.1,7.5],[147.2,-102.5,7.8],[145.4,-98.9,8.1],[143.7,-95.3,8.4],[141.9,-91.7,8.7],[140.0,-88.2,8.9],[138.1,-84.7,9.2],[136.0,-81.2,9.3],[133.8,-77.9,9.4],[131.4,-74.7,9.5],[128.7,-71.9,9.5],[125.5,-69.5,9.5],[122.0,-67.9,9.4],[118.1,-66.9,9.3],[114.2,-66.3,9.2],[110.2,-65.8,9.0],[106.2,-65.4,8.8],[102.3,-65.0,8.7],[98.3,-64.6,8.6],[94.3,-64.5,8.5],[90.3,-64.5,8.5],[86.3,-64.8,8.5],[82.3,-65.4,8.4],[78.4,-66.2,8.4],[74.6,-67.2,8.2],[70.7,-68.3,8.0],[66.9,-69.5,7.8],[63.1,-70.7,7.7],[59.3,-71.9,7.6],[55.5,-73.2,7.5],[51.7,-74.4,7.5],[47.9,-75.7,7.5],[44.1,-77.0,7.5],[40.3,-78.3,7.4],[36.5,-79.7,7.4],[32.7,-81.0,7.4],[29.0,-82.2,7.4],[25.2,-83.5,7.4],[21.4,-84.8,7.4],[17.6,-86.1,7.5],[13.8,-87.4,7.5],[10.0,-88.7,7.5],[6.2,-90.0,7.5],[2.4,-91.2,7.5],[-1.4,-92.4,7.6],[-5.2,-93.6,7.6],[-9.1,-94.7,7.7],[-12.9,-95.7,7.8],[-16.8,-96.7,7.9],[-20.8,-97.4,7.9],[-24.7,-98.0,7.9],[-28.7,-98.4,8.0],[-32.7,-98.5,8.1],[-36.7,-98.3,8.3],[-40.6,-97.9,8.4],[-44.6,-97.2,8.5],[-48.4,-96.0,8.6],[-52.0,-94.5,8.5],[-55.6,-92.7,8.3],[-59.1,-90.8,8.1],[-62.6,-88.8,7.9],[-66.1,-86.8,7.7],[-69.5,-84.8,7.6],[-72.9,-82.7,7.5],[-76.4,-80.6,7.5],[-79.8,-78.6,7.5],[-83.2,-76.5,7.5],[-86.6,-74.4,7.5],[-90.0,-72.3,7.5],[-93.4,-70.2,7.5],[-96.8,-68.0,7.5],[-100.2,-65.9,7.6],[-103.5,-63.7,7.7],[-106.9,-61.5,7.8],[-110.2,-59.3,7.9],[-113.6,-57.1,8.0],[-117.0,-55.0,8.0],[-120.4,-52.9,7.9],[-123.7,-50.7,7.8],[-126.9,-48.3,7.5],[-129.7,-45.5,7.3],[-132.0,-42.4,7.1],[-133.2,-38.8,7.0],[-133.1,-35.2,7.0],[-131.3,-32.2,7.0],[-128.2,-30.2,7.0],[-124.5,-29.2,7.0],[-120.6,-29.0,6.8],[-116.6,-29.2,9.5],[-112.6,-29.6,9.5],[-108.6,-29.9,9.5],[-104.6,-30.1,9.5],[-100.6,-30.2,9.5],[-96.6,-30.2,9.5],[-92.6,-30.2,9.5],[-88.6,-30.2,9.5],[-84.6,-30.2,9.5],[-80.6,-30.2,9.5],[-76.6,-30.2,9.5],[-72.6,-30.2,9.5],[-68.6,-30.2,9.5],[-64.6,-30.2,9.5],[-60.6,-30.2,9.5],[-56.6,-30.2,9.5],[-52.6,-30.2,9.5],[-48.6,-30.2,9.5],[-44.6,-30.2,9.5],[-40.6,-30.2,9.5],[-36.6,-30.2,9.5],[-32.6,-30.2,9.5],[-28.6,-30.2,9.5],[-24.6,-30.2,9.5],[-20.6,-30.2,9.5],[-16.6,-30.2,9.5],[-12.6,-30.2,9.5],[-8.6,-30.2,9.5],[-4.6,-30.2,9.5],[-0.6,-30.2,9.5],[3.4,-30.2,9.5],[7.4,-30.2,9.5]];
const BLOCK_RUNS=[[[9.5,-19.7],[13.5,-19.7],[17.5,-19.7],[21.5,-19.7],[25.5,-19.7],[29.5,-19.7],[33.5,-19.7],[37.5,-19.7],[41.5,-19.7],[45.5,-19.7],[49.5,-19.7],[53.5,-19.7],[57.5,-19.7],[61.5,-19.7],[65.5,-19.7],[69.5,-19.7],[73.5,-19.7],[77.5,-19.7],[81.5,-19.7],[85.3,-19.7],[89.0,-19.6],[92.3,-19.3],[95.1,-18.9],[97.9,-18.0],[102.0,-17.2],[107.5,-15.7],[113.5,-15.4],[118.5,-16.1],[122.3,-16.8],[125.6,-17.3],[128.9,-17.5],[132.5,-17.6],[136.4,-17.6],[140.4,-17.6]],[[279.5,-218.6],[277.7,-222.6],[275.7,-226.5],[273.6,-230.3],[271.4,-234.0]],[[237.1,-272.4],[233.7,-275.0],[230.2,-277.5],[226.6,-279.9]],[[215.5,-286.5],[211.6,-288.5],[207.7,-290.3],[203.7,-292.0],[199.7,-293.6],[195.6,-295.1],[191.4,-296.4],[187.3,-297.6],[183.1,-298.6]],[[168.2,-301.3],[163.9,-301.7],[159.6,-302.1],[155.3,-302.3],[151.2,-302.4],[147.1,-302.5],[143.1,-302.5]],[[136.9,-302.6],[132.6,-302.5],[127.9,-302.3],[122.8,-301.5],[117.3,-299.8],[112.1,-297.0],[107.7,-293.3],[104.4,-289.4],[102.0,-286.0],[99.8,-283.0],[97.6,-280.2]],[[-126.7,-258.8],[-131.8,-257.9],[-137.4,-255.8],[-142.8,-251.9],[-146.7,-246.6],[-148.8,-241.1]],[[-68.7,-131.4],[-64.1,-133.8],[-60.0,-137.3],[-56.8,-141.6],[-54.7,-146.0]],[[-37.3,-107.6],[-42.0,-107.2],[-46.8,-106.4],[-51.6,-105.0],[-56.0,-103.1]],[[-132.4,-54.8],[-136.0,-51.0],[-139.1,-46.2],[-141.2,-40.1],[-140.8,-33.0],[-137.0,-26.6],[-131.4,-22.9],[-125.7,-21.4]],[[-125.7,-21.4],[-120.5,-21.2],[-115.7,-18.7],[-111.7,-19.1],[-108.0,-19.4],[-104.3,-19.6],[-100.5,-19.7],[-96.6,-19.7],[-92.6,-19.7],[-88.6,-19.7],[-84.6,-19.7],[-80.6,-19.7],[-76.6,-19.7],[-72.6,-19.7],[-68.6,-19.7],[-64.6,-19.7],[-60.6,-19.7],[-56.6,-19.7],[-52.6,-19.7],[-48.6,-19.7],[-44.6,-19.7],[-40.6,-19.7],[-36.6,-19.7],[-32.6,-19.7],[-28.6,-19.7],[-24.6,-19.7],[-20.6,-19.7],[-16.6,-19.7],[-12.6,-19.7],[-8.6,-19.7],[-4.6,-19.7],[-0.6,-19.7],[3.4,-19.7],[7.4,-19.7]],[[104.5,-38.0],[107.9,-36.3],[110.0,-36.0],[111.8,-36.2],[114.7,-36.7],[118.7,-37.5],[123.3,-38.2],[128.0,-38.5],[132.4,-38.6],[136.5,-38.6]],[[86.2,-246.8],[81.7,-244.3],[76.7,-242.4],[71.6,-241.3],[66.8,-240.9]],[[76.3,-214.9],[79.5,-216.0],[82.5,-217.6],[85.7,-219.5],[89.1,-221.3],[92.6,-222.9]],[[144.8,-75.8],[142.3,-71.9],[139.4,-68.0],[135.6,-64.1],[130.9,-60.5],[125.4,-58.1],[120.1,-56.8],[115.5,-56.2],[111.3,-55.9]]];
const RT={n:0};
const DIFFS=[
 {name:'Fácil',  sub:'Rivais tranquilos',   aiMax:[.80,.82,.84],skill:.76, noise:.16, turbo:0,  rb:.08,rbAhead:.10,mist:.12},
 {name:'Médio',  sub:'Rivais competitivos', aiMax:[.93,.95,.97],skill:.90, noise:.06, turbo:1.6,rb:.05,rbAhead:.05,mist:.03},
 {name:'Difícil',sub:'Rivais implacáveis',  aiMax:[1.0,1.0,1.0],skill:1.0,noise:.012,turbo:.8, rb:.05,rbAhead:0,  mist:0}
];
const omegaCap=v=>{const av=Math.abs(v),r=clamp(av/CFG.maxV,0,1);return CFG.maxTurn*clamp(av/8,0,1)*(1-0.28*r)*(1-0.18*r);};
function buildRoute(){
  const A=ROUTE_RAW,m=A.length,x=[],z=[],hw=[];
  const cr=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<m;i++){const p0=A[(i+m-1)%m],p1=A[i],p2=A[(i+1)%m],p3=A[(i+2)%m];
    for(const t of[0,.5]){x.push(cr(p0[0],p1[0],p2[0],p3[0],t));z.push(cr(p0[1],p1[1],p2[1],p3[1],t));hw.push(p1[2]+(p2[2]-p1[2])*t);}}
  const n=x.length,s=new Float64Array(n),th=new Float64Array(n);let L=0;
  for(let i=0;i<n;i++){s[i]=L;const j=(i+1)%n;L+=Math.hypot(x[j]-x[i],z[j]-z[i]);}
  for(let i=0;i<n;i++){const a=(i+n-1)%n,b=(i+1)%n;th[i]=Math.atan2(x[b]-x[a],z[b]-z[a]);}
  // linha de corrida: relaxa a trajetória (menor curvatura) dentro da largura da pista
  const off=new Float64Array(n),K=4,pos=i=>[x[i]+Math.cos(th[i])*off[i],z[i]-Math.sin(th[i])*off[i]];
  for(let it=0;it<600;it++)for(let i=0;i<n;i++){
    const a=pos((i+n-K)%n),b=pos((i+K)%n),mx=(a[0]+b[0])/2-x[i],mz=(a[1]+b[1])/2-z[i];
    const o=mx*Math.cos(th[i])-mz*Math.sin(th[i]),lim=Math.max(.4,hw[i]-2.5);off[i]=clamp(o,-lim,lim);}
  const lx=[],lz=[],lth=new Float64Array(n),vp=new Float64Array(n),ds=L/n;
  for(let i=0;i<n;i++){const p=pos(i);lx.push(p[0]);lz.push(p[1]);}
  for(let i=0;i<n;i++){const a=(i+n-1)%n,b=(i+1)%n;lth[i]=Math.atan2(lx[b]-lx[a],lz[b]-lz[a]);}
  const kap=new Float64Array(n);
  for(let i=0;i<n;i++){const a=(i+n-2)%n,b=(i+2)%n;kap[i]=Math.abs(wrapPI(lth[b]-lth[a]))/Math.hypot(lx[b]-lx[a],lz[b]-lz[a]);}
  for(let i=0;i<n;i++){let kk=0;for(let d=-3;d<=3;d++)kk=Math.max(kk,kap[(i+d+n)%n]);
    let v=CFG.maxV;while(v>10&&v*kk>1.3*omegaCap(v))v-=.5;vp[i]=v;}
  const aB=38;for(let r=0;r<3*n;r++){const i=(n-1-(r%n)+n)%n,j=(i+1)%n;vp[i]=Math.min(vp[i],Math.sqrt(vp[j]*vp[j]+2*aB*ds));}
  Object.assign(RT,{n,x,z,hw,s,th,L,ds,off,lx,lz,lth,vp});
}
function pathAtRoute(s,off=0){
  const n=RT.n;s=((s%RT.L)+RT.L)%RT.L;let lo=0,hi=n-1;
  while(lo<hi){const m=(lo+hi+1)>>1;if(RT.s[m]<=s)lo=m;else hi=m-1;}
  const j=(lo+1)%n,len=(lo+1<n?RT.s[lo+1]:RT.L)-RT.s[lo],f=(s-RT.s[lo])/len;
  const x=RT.x[lo]+(RT.x[j]-RT.x[lo])*f,z=RT.z[lo]+(RT.z[j]-RT.z[lo])*f,th=RT.th[lo]+wrapPI(RT.th[j]-RT.th[lo])*f;
  return {x:x+Math.cos(th)*off,z:z-Math.sin(th)*off,th};
}
function projectRoute(x,z){
  let b=0,bd=1e18;for(let i=0;i<RT.n;i++){const d=(x-RT.x[i])**2+(z-RT.z[i])**2;if(d<bd){bd=d;b=i;}}
  const c=Math.cos(RT.th[b]),sn=Math.sin(RT.th[b]);
  return {s:RT.s[b]+(x-RT.x[b])*sn+(z-RT.z[b])*c,lat:(x-RT.x[b])*c-(z-RT.z[b])*sn};
}
const project=(x,z)=>RT.n?projectRoute(x,z):projectOval(x,z);
const pathAt=(s,off=0)=>RT.n?pathAtRoute(s,off):pathAtOval(s,off);
// localiza o ponto do traçado mais próximo (janela local; busca global se não houver histórico)
function routeLocate(k){
  const n=RT.n,g=k.ri===undefined;let b=0,bd=1e18;
  for(let d=g?0:-30;d<=(g?n-1:30);d++){const i=g?d:(k.ri+d+n)%n,dd=(k.x-RT.x[i])**2+(k.z-RT.z[i])**2;if(dd<bd){bd=dd;b=i;}}
  k.ri=b;
}
// ===== Muros invisíveis: ninguém sai da largura da pista (jogador e rivais) =====
function applyWalls(k,dt){
  routeLocate(k);const i=k.ri,c=Math.cos(RT.th[i]),sn=Math.sin(RT.th[i]);
  const lat=(k.x-RT.x[i])*c-(k.z-RT.z[i])*sn,lim=RT.hw[i]-.45;
  if(Math.abs(lat)<=lim)return;
  const sg=Math.sign(lat),over=Math.abs(lat)-lim,nx=sg*c,nz=-sg*sn;
  k.x-=nx*over;k.z-=nz*over;
  const vn=k.vx*nx+k.vz*nz;
  if(vn>0){
    const sa=Math.min(1,vn/(Math.hypot(k.vx,k.vz)+.001));
    k.vx-=nx*vn*1.1;k.vz-=nz*vn*1.1;
    const loss=1-.55*sa;k.v*=loss;k.vx*=loss;k.vz*=loss;
    if(sa>.3){k.boostT=0;if(k.drifting)endDrift(k);}
    if(k.v>0)k.th+=clamp(wrapPI(RT.th[i]-k.th),-1,1)*Math.min(1,6*dt)*.6;
    k.wall=Math.max(k.wall||0,.3);k.hits=(k.hits||0)+(sa>.15?1:0);
  }
}
function initProgress(k){
  k.ri=undefined;routeLocate(k);
  const i=k.ri,s=RT.s[i]+(k.x-RT.x[i])*Math.sin(RT.th[i])+(k.z-RT.z[i])*Math.cos(RT.th[i]);
  k.prog=s>RT.L/2?s-RT.L:s;k.sLast=s;k.cross=Math.floor(k.prog/RT.L);k.shift=0;k.cT=0;k.stuckT=0;k.nz=0;k.errT=0;k.dist=k.prog;
}
function updateProgress(k){
  const i=k.ri,s=RT.s[i]+(k.x-RT.x[i])*Math.sin(RT.th[i])+(k.z-RT.z[i])*Math.cos(RT.th[i]);
  let d=s-k.sLast;if(d>RT.L/2)d-=RT.L;if(d<-RT.L/2)d+=RT.L;
  k.prog+=d;k.sLast=s;k.dist=k.prog;
}
function updateCheckpoints(k){
  if(!RT.n)return updateCheckpointsOld(k);
  updateProgress(k);
  const cr=Math.floor(k.prog/RT.L);
  if(cr>k.cross&&!k.finished){
    k.cross=cr;
    if(!k.startedLap){k.startedLap=true;k.lapStart=raceTime;}
    else{
      const lt=raceTime-k.lapStart;k.laps.push(lt);k.lastLap=lt;
      if(lt<k.best)k.best=lt;
      if(k.isPlayer){$('lastTime').textContent=fmt(lt);if(lt<=k.best){$('bestTime').textContent=fmt(k.best);flash('NOVA MELHOR VOLTA!');}}
      k.lapCount=(k.lapCount||0)+1;k.lapStart=raceTime;
      if(k.lapCount>=CFG.laps){k.finished=true;k.finT=raceTime;if(k.isPlayer)onPlayerFinish();}
    }
  }
}
function respawnOnLine(k){
  const i=k.ri,p=pathAtRoute(RT.s[i],RT.off[i]);
  k.x=p.x;k.z=p.z;k.th=p.th;k.v=0;k.vx=k.vz=0;k.steer=0;k.boostT=0;k.drifting=false;k.stuckT=0;k.slip=0;
}
// ===== IA: segue a linha de corrida, freia pelo perfil de velocidade, ultrapassa =====
function aiInput(k,dt){
  if(!RT.n)return aiInputOld(k);
  const n=RT.n,D=DIFFS[sel.diff],v=Math.max(Math.abs(k.v),5),li=k.ri,base=k.baseMax||1;
  const skill=k.isPlayer?.95:D.skill*(k.skillV||1);
  if(!k.isPlayer){
    const gap=player.prog-k.prog;
    k.aiMax=base*(1+(gap>0?D.rb*clamp(gap/160,0,1):-D.rbAhead*clamp(-gap/160,0,1)));
  }
  // oponentes à frente: desvia para o lado livre e iguala a velocidade se não der para passar
  const st=Math.sin(k.th),ct=Math.cos(k.th);let shiftT=0,vcap=99;
  for(const o of karts){if(o===k)continue;
    const dx=o.x-k.x,dz=o.z-k.z,fwd=dx*st+dz*ct,lat=dx*ct-dz*st;
    if(fwd>-1&&fwd<18&&Math.abs(lat)<3.4){
      const room=RT.hw[li]-1.8;
      shiftT=Math.abs(lat)<.4?(RT.off[li]>0?-3.2:3.2):(lat>0?-3.2:3.2);
      if(Math.abs(RT.off[li]+shiftT)>room)shiftT=-shiftT;
      if(fwd<7&&Math.abs(lat)<2.4)vcap=Math.min(vcap,Math.max(o.v*.97,6));
      break;}}
  k.shift+=(shiftT-k.shift)*Math.min(1,3*dt);
  // alvo à frente na linha (pure pursuit)
  const Ld=clamp(4+v*.3,6,20),j=(li+Math.round(Ld/RT.ds))%n;
  const lt=clamp(RT.off[j]+k.shift,-(RT.hw[j]-1.8),RT.hw[j]-1.8);
  const tx=RT.x[j]+Math.cos(RT.th[j])*lt,tz=RT.z[j]-Math.sin(RT.th[j])*lt;
  const dx=tx-k.x,dz=tz-k.z,dist=Math.hypot(dx,dz)+.01,alpha=wrapPI(Math.atan2(dx,dz)-k.th);
  const omega=2*v*Math.sin(alpha)/dist,oc=Math.max(omegaCap(v),.3);
  let steer=clamp(omega/oc,-1,1);
  // humanização por dificuldade: ruído de direção e pequenos erros
  k.nz+=(Math.random()*2-1-k.nz)*Math.min(1,2*dt);steer=clamp(steer+k.nz*D.noise,-1,1);
  if(k.errT>0){k.errT-=dt;steer=clamp(steer+k.errDir*.5,-1,1);}
  else if(!k.isPlayer&&Math.random()<D.mist*dt){k.errT=.5;k.errDir=Math.random()<.5?-1:1;}
  // turbo de saída de curva (equivalente ao mini-turbo do drift do jogador)
  if(Math.abs(omega)/oc>.4&&v>16)k.cT+=dt;
  else{if(D.turbo&&k.cT>=D.turbo&&k.cT>.8)k.boostT=Math.max(k.boostT,k.cT>1.6?1.4:.85);k.cT=0;}
  // velocidade alvo
  const jv=(li+Math.ceil(v*.35/RT.ds))%n;let vt=RT.vp[jv]*skill;
  if(k.boostT>0&&RT.vp[jv]>=CFG.maxV*.97)vt*=1.25;
  vt=Math.min(vt,vcap);
  const vr=k.v;let throttle=vr<vt-.5?1:0,brake=vr>vt+.8?clamp((vr-vt)*.5,.3,1):0;
  if(k.errT>0)throttle=0;
  // anti-travamento
  if(state==='racing'){k.stuckT=Math.abs(k.v)<2.5?k.stuckT+dt:0;if(k.stuckT>1.8)respawnOnLine(k);}
  return {throttle,brake,steer,drift:false};
}
// ===== Barreiras visíveis nas aberturas para outras ruas =====
function buildBlockers(){
  const segs=[];for(const r of BLOCK_RUNS)for(let i=0;i+1<r.length;i++)segs.push([r[i],r[i+1]]);
  const list=[];
  for(const [a,b] of segs){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),cnt=Math.max(1,Math.round(len/2.2)),ang=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
    for(let q=0;q<cnt;q++){const f=(q+.5)/cnt;list.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,ang]);}}
  const geo=new THREE.BoxGeometry(2.3,1.05,.75),mk=c=>new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:c,roughness:.7}),list.length);
  const M=[mk(0xe8e8e8),mk(0xe10600)],cnt=[0,0],m=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
  list.forEach((b,i)=>{
    _v.set(b[0],28,b[1]);ray.set(_v,DOWN);
    let h=groundRoad.length?ray.intersectObjects(groundRoad,false):[];if(!h.length&&groundOther.length)h=ray.intersectObjects(groundOther,false);
    const y=h.length?h[0].point.y:0,t=i%2;
    q.setFromAxisAngle(up,b[2]);p.set(b[0],y+.5,b[1]);m.compose(p,q,sc);M[t].setMatrixAt(cnt[t]++,m);});
  M.forEach((o,t)=>{o.count=cnt[t];o.castShadow=o.receiveShadow=true;scene.add(o);});
}
/*ROUTE_END*/


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
const sel={kart:0,pilot:0,diff:1};
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
  if(g)buildRoute();
  buildRoadMask();
  if(RT.n){try{buildBlockers();}catch(e){console.warn('barreiras visuais falharam',e);}}
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
function makePilot(pi,kcfg){ // piloto sentado no kart: modelos com esqueleto são posados (sentado, mãos no volante); estáticos são cortados na cintura
  const gl=assets[PILOTS[pi].file],holder=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const hipY=kcfg.seat[1],V=THREE.Vector3,Q=THREE.Quaternion,Y=new V(0,1,0),seat=new V(kcfg.seat[0],kcfg.seat[1],kcfg.seat[2]);
  let ok=false;
  if(gl){try{
    const m=SkeletonUtils.clone(gl.scene);holder.add(m);
    const bone=re=>{let r=null;m.traverse(o=>{if(!r&&o.isBone&&re.test(o.name))r=o;});return r;};
    const wp=o=>o.getWorldPosition(new V());
    const hips=bone(/Hips_?\d*$/),head=bone(/Head_\d+$/),top=bone(/HeadTop_End/),Lsh=bone(/LeftShoulder_\d+$/),Rsh=bone(/RightShoulder_\d+$/);
    holder.updateMatrixWorld(true);
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;(Array.isArray(o.material)?o.material:[o.material]).forEach(mt=>{if(mt)mt.side=THREE.DoubleSide;});}});
    if(hips&&head&&top&&Lsh&&Rsh){
      // alinha: cabeça para cima (+Y) e frente do corpo para +Z
      const u=wp(head).sub(wp(hips)).normalize(),l=wp(Lsh).sub(wp(Rsh));
      const q1=new Q().setFromUnitVectors(u,Y);l.applyQuaternion(q1);l.y=0;l.normalize();
      const f=new V().crossVectors(l,Y);
      holder.quaternion.copy(new Q().setFromAxisAngle(Y,-Math.atan2(f.x,f.z)).multiply(q1));holder.updateMatrixWorld(true);
      // gira o osso B para o segmento B→C apontar na direção t
      const aim=(a,b,t)=>{const B=bone(a),C=bone(b);if(!B||!C)return;B.updateWorldMatrix(true,false);
        const qd=new Q().setFromUnitVectors(wp(C).sub(wp(B)).normalize(),t.clone().normalize());
        const wq=B.getWorldQuaternion(new Q()),pq=B.parent.getWorldQuaternion(new Q()).invert();
        B.quaternion.copy(pq.multiply(qd).multiply(wq));B.updateMatrixWorld(true);};
      for(const s of[1,-1]){const S=s>0?'Left':'Right',R=n=>new RegExp(S+n+'_\\d+$');
        aim(R('UpLeg'),R('Leg'),new V(s*.10,-.06,1));      // coxa para frente
        aim(R('Leg'),R('Foot'),new V(s*.04,-1,.18));       // canela para baixo
        aim(R('Foot'),R('ToeBase'),new V(0,-.35,1));       // pé nos pedais
        aim(R('Arm'),R('ForeArm'),new V(s*.45,-.62,.62));  // braço para frente
        aim(R('ForeArm'),R('Hand'),new V(-s*.12,.12,1));}  // mãos no volante
      const D=wp(top).y-wp(hips).y,s=.5*kcfg.H/(isFinite(D)&&D>1e-4?D:1);
      holder.scale.setScalar(s);holder.updateMatrixWorld(true);
      holder.position.add(seat.clone().sub(wp(hips)));holder.updateMatrixWorld(true);
      ok=isFinite(holder.position.x+holder.position.y+holder.position.z)&&s>0;
    }else{
      const box=new THREE.Box3().setFromObject(holder,true),h=box.max.y-box.min.y,s=kcfg.H/(isFinite(h)&&h>.01?h:1.8);
      const cx=(box.max.x+box.min.x)/2,cz=(box.max.z+box.min.z)/2;
      holder.scale.setScalar(s);holder.position.set(seat.x-cx*s,hipY-.5*kcfg.H-box.min.y*s,seat.z-cz*s);
      m.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];
        const cl=mats.map(mt=>{const c=mt.clone();c.clippingPlanes=[plane];c.side=THREE.DoubleSide;return c;});o.material=Array.isArray(o.material)?cl:cl[0];}});
      ok=isFinite(s)&&s>0;
    }
  }catch(e){console.warn('Piloto falhou, usando reserva',e);ok=false;holder.clear();holder.scale.setScalar(1);holder.position.set(0,0,0);holder.quaternion.identity();}}
  if(!ok){
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,4,8),new THREE.MeshStandardMaterial({color:0xffffff}));body.position.set(kcfg.seat[0],hipY+0.5,kcfg.seat[2]);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.3,12,12),new THREE.MeshStandardMaterial({color:0xe10600}));hd.position.set(kcfg.seat[0],hipY+1.3,kcfg.seat[2]);
    holder.add(body,hd);
  }
  return {holder,mixer:null,plane,hipY};
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
  for(let i=0;i<CFG.aiCount;i++){const k=createKart(aiK[i],aiP[i],false,i);k.aiMax=DIFFS[sel.diff].aiMax[i];k.baseMax=k.aiMax;k.skillV=[1,.99,.98][i];k.lane=[3.2,-3.2,3.2][i];karts.push(k);}
  player=createKart(sel.kart,sel.pilot,true,0);karts.push(player);
  // grid de largada (2 colunas) atrás da linha
  const slots=[[S0off(6),3.2],[S0off(6),-3.2],[S0off(18),3.2],[S0off(18),-3.2]];
  karts.forEach((k,i)=>{const sl=slots[i],p=pathAt(sl[0],sl[1]);k.x=p.x;k.z=p.z;k.th=p.th;k.y=0;
    k.sPrev=project(k.x,k.z).s;k.dist=0;k.hits=0;if(RT.n)initProgress(k);k.lapCount=0;k.startedLap=false;k.cpPrevX=k.x;k.cpPrevZ=k.z;
    k.y=groundAt(k).y;k.root.position.set(k.x,k.y,k.z);k.root.rotation.y=k.th;});
  raceTime=0;cdTime=0;cdGo=0;goShown=0;state='countdown';
  karts.forEach(k=>k.s=project(k.x,k.z).s);camTh=player.th;updateCamera(0.016,true);
  $('lights').style.display='flex';[...document.querySelectorAll('.l')].forEach(l=>l.classList.remove('on'));$('go').style.display='none';
  $('bestTime').textContent='--:--.---';$('lastTime').textContent='--:--.---';$('msg').textContent='';
  if(!audio)initAudio();
}
const S0off=d=>RT.n?RT.L-d:TR.S0-d;
function placeGridPreview(){ // câmera de abertura sobre a reta de largada
  const p=pathAt(S0off(30),0);camera.position.set(p.x-25,14,p.z-30);camera.lookAt(p.x+40,1,p.z);
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
  k.steer+=(inp.steer-k.steer)* (1-Math.exp(-(k.isPlayer?5.2:9)*dt));
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
  if(!RT.n&&!k.isPlayer&&!roadAt(k.x,k.z)){
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
  if(RT.n)applyWalls(k,dt);
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
function updateCheckpointsOld(k){
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
function ranking(){return [...karts].sort((a,b)=>(b.finished?1e6-b.finT:b.prog)-(a.finished?1e6-a.finT:a.prog));}
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
function aiInputOld(k){
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
  if(RT.n){c.strokeStyle='rgba(255,210,74,.9)';c.lineWidth=1.6;c.beginPath();for(let i=0;i<=RT.n;i+=3){const j=i%RT.n;i?c.lineTo(X(RT.x[j]),Z(RT.z[j])):c.moveTo(X(RT.x[j]),Z(RT.z[j]));}c.closePath();c.stroke();}
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
  mk('kartCards',KARTS,'kart');mk('pilotCards',PILOTS,'pilot');mk('diffCards',DIFFS,'diff');
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
    if(racing){inp=(k.isPlayer&&!k.autopilot)?playerInput():aiInput(k,dt);}
    else if(state==='countdown'&&!k.isPlayer){}
    if(racing||state==='countdown'){ if(state==='countdown'){k.v=0;k.vx=k.vz=0;} else updateVehiclePhysics(k,dt,inp); }
    k.wall=Math.max(0,k.wall-dt);
    k.s=project(k.x,k.z).s;
    if(state!=='countdown')updateCheckpoints(k);
  }
  if(racing){separateKarts();if(RT.n)for(const k of karts)applyWalls(k,dt);raceTime+=dt;}
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
