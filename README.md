<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>F1 Kart Racing 3D — Descrição do jogo</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f4f5f8;--card:#ffffff;--txt:#161a24;--dim:#5b6478;--line:rgba(20,26,40,.14);--red:#e10600;--chip:#eceef4;
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0b0d12;--card:#141a28;--txt:#f2f4f8;--dim:#98a2b3;--line:rgba(255,255,255,.14);--chip:rgba(255,255,255,.08)}}
:root[data-theme="dark"]{--bg:#0b0d12;--card:#141a28;--txt:#f2f4f8;--dim:#98a2b3;--line:rgba(255,255,255,.14);--chip:rgba(255,255,255,.08)}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:'Rajdhani','Segoe UI',system-ui,sans-serif;font-size:18px;line-height:1.5}
.orb{font-family:'Orbitron','Segoe UI',monospace}
.hero{background:radial-gradient(ellipse at 30% 0%,#1c2540,#07080c 70%);color:#f2f4f8;padding:64px 20px 56px;text-align:center}
.hero h1{font-size:clamp(28px,6vw,60px);font-weight:900;letter-spacing:3px}
.hero h1 span{color:var(--red)}
.hero p{max-width:680px;margin:16px auto 0;color:#c4cbd9;font-size:20px}
.cta{display:inline-block;margin-top:26px;padding:13px 40px;background:var(--red);color:#fff;text-decoration:none;font-family:'Orbitron',sans-serif;font-weight:900;letter-spacing:3px;font-size:16px;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)}
.cta:hover{filter:brightness(1.15)}
main{max-width:980px;margin:0 auto;padding:36px 20px 60px}
section{margin-top:40px}
h2{font-family:'Orbitron',sans-serif;font-size:20px;letter-spacing:2px;margin-bottom:14px;padding-left:12px;border-left:4px solid var(--red)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 18px}
.card h3{font-size:20px;margin-bottom:4px}
.card p{color:var(--dim)}
.tag{display:inline-block;margin-top:8px;padding:2px 10px;border-radius:999px;background:var(--chip);font-size:14px;font-weight:700;color:var(--dim)}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-size:13px;letter-spacing:2px;color:var(--dim);text-transform:uppercase}
tr:last-child td{border-bottom:0}
kbd{background:var(--chip);border:1px solid var(--line);border-radius:4px;padding:1px 9px;font-family:inherit;font-weight:700}
pre{background:#0f1422;color:#dbe2f0;border-radius:8px;padding:16px 18px;overflow-x:auto;font-size:15px;line-height:1.55}
ul{padding-left:22px;color:var(--dim)}li{margin:4px 0}li b{color:var(--txt)}
.note{color:var(--dim);margin-top:10px;font-size:16px}
footer{text-align:center;color:var(--dim);padding:24px 20px 40px;font-size:15px}
</style>
</head>
<body>
<header class="hero">
  <h1 class="orb">F1 <span>KART</span> RACING 3D</h1>
  <p>Corrida de kart em 3D direto no navegador. Escolha seu kart e seu piloto, escolha a dificuldade dos rivais e dispute 3 voltas num circuito único contra 3 adversários.</p>
  <a class="cta" href="https://claude.ai/artifact/9qKwkZu1yUXsNRQ5xFGqAH">JOGAR</a>
</header>

<main>
  <section>
    <h2>Destaques</h2>
    <div class="grid">
      <div class="card"><h3>Circuito único</h3><p>Uma volta fechada de cerca de 1935 unidades. Muros, barreiras e limites impedem atalhos pelas outras ruas do modelo.</p></div>
      <div class="card"><h3>Rivais que correm de verdade</h3><p>Seguem uma linha de corrida, freiam antes das curvas, desviam e ultrapassam, com 3 níveis de dificuldade.</p></div>
      <div class="card"><h3>Drift com mini-turbo</h3><p>Segure o drift na curva e saia com um impulso de velocidade. Quanto mais longo o drift, maior o turbo.</p></div>
      <div class="card"><h3>HUD completo</h3><p>Volta atual, tempo da volta, melhor e última volta, posição, velocímetro, barra de turbo e minimapa com o traçado.</p></div>
    </div>
  </section>

  <section>
    <h2>Controles</h2>
    <div class="scroll"><table>
      <tr><th>Tecla</th><th>Ação</th></tr>
      <tr><td><kbd>W</kbd></td><td>Acelerar</td></tr>
      <tr><td><kbd>S</kbd></td><td>Frear / ré</td></tr>
      <tr><td><kbd>A</kbd> <kbd>D</kbd></td><td>Virar</td></tr>
      <tr><td><kbd>Espaço</kbd></td><td>Drift</td></tr>
      <tr><td><kbd>R</kbd></td><td>Reiniciar a corrida</td></tr>
    </table></div>
    <p class="note">Clique na tela do jogo para ela receber o teclado.</p>
  </section>

  <section>
    <h2>Karts</h2>
    <div class="grid">
      <div class="card"><h3>Go-Kart Clássico</h3><p>Leve e ágil.</p><span class="tag">kart_go.glb</span></div>
      <div class="card"><h3>Kart Cartoon</h3><p>Visual divertido.</p><span class="tag">kart_cartoon.glb</span></div>
      <div class="card"><h3>F1 Senna 1991</h3><p>Pura velocidade.</p><span class="tag">kart_f1.glb</span></div>
    </div>
  </section>

  <section>
    <h2>Pilotos</h2>
    <div class="grid">
      <div class="card"><h3>Cientista Farmacêutico</h3><p>Modelo com esqueleto, posado sentado com as mãos no volante.</p><span class="tag">pilot_scientist.glb</span></div>
      <div class="card"><h3>Modelagem de Personagens</h3><p>Modelo estático, mostrado da cintura para cima no cockpit.</p><span class="tag">pilot_modelagem.glb</span></div>
    </div>
  </section>

  <section>
    <h2>Dificuldade dos rivais</h2>
    <div class="scroll"><table>
      <tr><th>Nível</th><th>Volta aproximada</th><th>Comportamento</th></tr>
      <tr><td>Fácil</td><td>~70 s</td><td>Mais lentos, com erros e direção instável</td></tr>
      <tr><td>Médio (padrão)</td><td>~60 s</td><td>Competitivos, poucos erros</td></tr>
      <tr><td>Difícil</td><td>~55 s</td><td>No limite do carro, quase sem erros</td></tr>
    </table></div>
    <p class="note">Os tempos vêm de simulações. Os rivais ganham uma leve ajuda de velocidade quando ficam muito atrás de você.</p>
  </section>

  <section>
    <h2>Regras da corrida</h2>
    <ul>
      <li><b>3 voltas</b> com largada por 5 luzes; você sai em 4º lugar.</li>
      <li><b>Posição e voltas</b> contam pela distância percorrida no circuito, então cortar caminho não adianta.</li>
      <li><b>Sair do asfalto</b> reduz a velocidade; bater nos muros também.</li>
    </ul>
  </section>

  <section>
    <h2>Como rodar localmente</h2>
    <pre>cd meu-jogo
python -m http.server 8000
# abra http://localhost:8000</pre>
    <p class="note">Os modelos 3D são carregados por <code>fetch</code>, então não funciona clicando direto no <code>index.html</code>. É preciso internet para o Three.js e as fontes.</p>
  </section>

  <section>
    <h2>Estrutura de arquivos</h2>
<pre>meu-jogo/
├── index.html
├── style.css
├── script.js
├── GDD.md
└── assets/
    ├── imagens/
    ├── sons/
    ├── fontes/
    └── modelos/</pre>
  </section>
</main>
<footer>F1 Kart Racing 3D · feito com Three.js</footer>
</body>
</html>
