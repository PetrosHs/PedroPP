<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>F1 Kart Racing 3D — Descrição do jogo</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
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
