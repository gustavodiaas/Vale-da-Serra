# Springfield: passagem de bastão

## Orientação atual do proprietário

Projeto pessoal, desktop, Vite + React + TypeScript + Three.js. Direção visual mais recente: desenho cartoon semelhante à série, evitando aspecto de maquete ou render realista. A solicitação mais recente substitui os conceitos de startup, Califórnia e vila nórdica: criar uma Springfield ampla, com a casa dos Simpsons como lar, personagens e locais utilizáveis para as finanças pessoais. A preferência antiga por arte sem personagens de terceiros foi expressamente substituída por esse pedido.

Responder em português brasileiro, direto, sem travessão. Não abrir navegador, Playwright nem capturar screenshots: o proprietário testa e envia imagens. Atualizações verificadas podem ser enviadas diretamente a main de gustavodiaas/Vale-da-Serra. Push não comprova deploy Vercel.

## Implementado

- 106 construções / áreas selecionáveis: 47 locais nomeados e 59 casas de bairro; dez personagens também selecionáveis. Disposição própria para o aplicativo, sem pretensão de cartografia canônica.
- 32 moradores em sprites 2D desenhados por código, com quatro quadros por estilo e atlas único, incluindo Homer, Marge, Bart de skate, Lisa, Maggie, Apu, Krusty, Ned, Wiggum e Burns. Percursos com pausas e retorno; quatro personagens ficam próximos dos seus locais.
- 24 carros e um ônibus escolar em trajetos retangulares, três barcos, arborização, calçadas, faixas e sinaleiras decorativas. As sinaleiras ainda não controlam o tráfego.
- Letreiros em atlas único; geometrias estáticas agrupadas por região/material; peças de personagens e veículos compartilhadas. Não há downloads de modelos de Springfield.
- Busca e categorias no menu Explorar Springfield; seleção enquadra o destino e abre sua ação. Botão de visão geral; zoom e arraste com amortecimento; rótulos DOM para locais principais.
- Todos os destinos têm ação em springfieldActions.ts, ligada aos formulários e painéis existentes. Não há débito por visita. Kwik-E-Mart / Apu usam vale por padrão, outros comércios usam dinheiro. O formulário permite escolher a carteira.
- Casa dos Simpsons preservada em todos os cinco estágios. Jardim adicional a partir do nível 3; não transformar a casa em startup nem trocar por torre.

## Finanças e dados

Não alterar src/engine ou os testes existentes sem um novo pedido. Dados e backup compatíveis: chave garagem:personal:v1. Lançamentos em centavos; entradas, fixas, diários, vale separado, reserva, resgates, perfil, salário/benefício previstos, meta e avisos. Casas e bairros compartilham o controle financeiro do próprio usuário.

src/homeJourney.ts preserva nomes residenciais e marcos de cobertura em 1, 3, 6 e 12 meses. IDs antigos permanecem por compatibilidade. O selo reflete o nível calculado; a maior conquista visual fica em garagem:vale:unlocked:v1.

## Cena e API

Cena ativa em springfieldCity.ts, catálogo em springfieldLocations.ts, arquitetura em springfieldBuildings.ts, kit e agrupamento em springfieldKit.ts, pessoas e carros nos respectivos módulos. A vila nórdica, modelos CC0 e testes anteriores permanecem como legado, fora da cena atual. fjordWater.ts aceita sampler de relevo e extensão opcionais; valores padrão anteriores preservados.

API preservada: setStage, setWeather, setLabel, zoom, reset, dispose. Opções existentes: setQuality e setTimeOfDay. Acrescentados focusLocation e overview. Seleção aceita metadados opcionais do destino como segundo argumento.

createVale.ts usa câmera ortográfica e não aplica tone mapping, HDRI ou sombras realistas. cartoonLook.ts fornece paleta viva e pintura sem reflexos, com duas faixas de sombra. cartoonFinish.ts acrescenta contornos em todos os níveis e FXAA no alto/médio, sem bloom, vinheta ou desfoque. cartoonPeopleArt.ts desenha o atlas de personagens com Canvas2D; springfieldPeople.ts os anima e compartilha a textura. Liberar todos os materiais do atlas com city.people.dispose(). desktopQuality.ts preserva ajuste automático de resolução. Não afirmar desempenho de GPU sem medição.

## Validação e limites

Os 55 testes anteriores permanecem intactos, com três verificações adicionais de câmera ortográfica, shaders e sprites, totalizando 58. Testes adicionais verificam catálogo, seleção de todos os destinos, ações financeiras, animação, cancelamento e orçamento. Build inclui TypeScript e Vite.

Sem navegador ou avaliação visual automática, conforme pedido. Ainda não há interiores 3D, conversas, missões, trânsito com colisão ou todos os locais já mostrados na série. Arte temática é interpretação estilizada em código, sem extração de jogos ou assets oficiais. Não apresentar a temática como CC0; ver CREDITS.md.

Supabase permanece futuro. Não executar migrações, criar login ou mudar persistência em ajustes visuais. Moedas ainda são a contagem visual existente, sem loja nem economia independente.
