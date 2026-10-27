# PedroPP
F1 Kart Racing 3D é um jogo de corrida arcade em terceira pessoa desenvolvido inteiramente para rodar no navegador, utilizando HTML5, CSS3 e JavaScript ES Modules com a biblioteca gráfica Three.js (v0.170.0).

Como o Jogo Funciona:
Carregamento de Recursos: Ao abrir o jogo, um loader assíncrono baixa os modelos 3D em formato .glb (a pista, os três modelos de kart e os dois modelos de pilotos) localizados na pasta assets/modelos/.

Menu e Seleção: O jogador escolhe entre 3 modelos de kart (Go-Kart Clássico, Kart Cartoon e F1 Senna 1991) e 2 modelos de piloto (Cientista Farmacêutico e Modelagem de Personagens).

Pista e Mapeamento de Asfalto (Road Mask):

O cenário 3D inclui iluminação com sombras dinâmicas, neblina e vegetação (árvores instanciadas).

O circuito é um oval estilo estádio composto por duas retas e duas curvas em semicírculo.

O código lê a geometria 3D da pista e desenha o asfalto em um canvas oculto de alta resolução (roadMask). Esse mapa de pixels brancos/pretos é usado para detectar se um veículo está na pista, alimentar a navegação da IA dos adversários e desenhar o minimapa no HUD.

Física Arcade e Mecânica de Drift:

Controles via teclado (W/S para acelerar/frear, A/D para virar, Espaço para Drift, R para reiniciar).

Se o jogador faz curva em alta velocidade pressionando a tecla de Drift, o veículo derrapa emitindo faíscas coloridas. Manter o drift acumula tempo e ativa um Mini-Turbo (Boost) ao soltar a tecla.

Sair do asfalto reduz drasticamente a velocidade e aplica penalidades de tempo.

Inteligência Artificial (Rivais):

Três karts adversários utilizam um algoritmo de busca local (raycasting/probing no asfalto) que testa múltiplos ângulos de esterço à frente, escolhendo o caminho que os mantém no asfalto, evita colisões com rivais e prevê curvas reduzindo a velocidade se necessário.

Efeitos Visuais e Sonoros:

Áudio Sintetizado: Utiliza a Web Audio API para gerar dinamicamente os sons do motor (usando osciladores e filtros passa-baixa) e o ruído de derrapagem dos pneus, variando o tom de acordo com o kart escolhido e o RPM/velocidade.

Câmera Dinâmica: Câmera de perseguição que se ajusta suavemente (lerp) e expande o campo de visão (FOV) quando em alta velocidade ou sob o efeito de turbo.
