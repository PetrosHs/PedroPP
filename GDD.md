# F1 Kart Racing 3D — Game Design Document

## Visão geral
Jogo de corrida 3D em navegador, desenvolvido com JavaScript ES Modules e Three.js. O projeto inclui seleção de veículo, corrida em circuito 3D, HUD, adversários controlados por IA, voltas e efeitos sonoros sintetizados quando implementados no código.

## Estrutura do projeto
- `index.html`: estrutura da interface e mapa de importação do Three.js.
- `style.css`: aparência, HUD, menus e layout responsivo.
- `script.js`: cena 3D, carregamento de modelos, física, controles, IA, áudio e lógica da corrida.
- `assets/modelos/`: modelos GLB extraídos do HTML original.
- `assets/imagens/`, `assets/sons/`, `assets/fontes/`: pastas para arquivos adicionais.

## Tecnologia
- HTML5 e CSS3.
- JavaScript ES Modules.
- Three.js 0.170.0 e addons carregados via CDN/import map.
- Modelos 3D em formato GLB.

## Execução
1. Mantenha a estrutura de pastas intacta.
2. Como o projeto usa módulos JavaScript e carrega arquivos GLB externos, execute por um servidor HTTP local (não abra `index.html` diretamente com `file://`).
3. Exemplo com Python instalado: abra um terminal dentro da pasta `meu-jogo` e execute `python -m http.server 8000`.
4. Acesse `http://localhost:8000`.
5. É necessária conexão com a internet para carregar Three.js e as fontes Google configuradas no projeto.

## Controles
Os controles exibidos no próprio jogo são a referência. A configuração atual utiliza teclado para pilotar; confira a seção de controles na interface inicial/HUD.

## Assets
Os modelos GLB que antes estavam codificados em Base64 no HTML foram separados em arquivos dentro de `assets/modelos/`. As pastas de imagens, sons e fontes ficam disponíveis para recursos adicionais.

## Limitações conhecidas
A separação de arquivos organiza o código, mas não garante por si só que a IA siga perfeitamente todo o traçado. O comportamento deve ser validado numa corrida real em navegador, sobretudo curvas fechadas, colisões, ultrapassagens e limites do circuito.
