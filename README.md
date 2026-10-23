# Springfield pessoal

Recriação de fã de Springfield em Three.js para organizar finanças pessoais. A casa dos Simpsons é o lar do usuário. Projeto pessoal, não oficial, anteriormente chamado Garagem / Vale da Serra.

## Rodar

    npm install
    npm run dev
    npm test
    npm run build

## A cidade

106 destinos físicos: 47 locais nomeados e 59 casas de bairro. Inclui Evergreen Terrace, Kwik-E-Mart, Krusty Burger, Moe's, Lard Lad, escola, banco, biblioteca, prefeitura, hospital, igreja, usina nuclear, Duff, mansão Burns, estádio, lago, Krustyland, aeroporto e porto. A disposição é uma composição para este aplicativo, não um mapa canônico de todos os episódios.

32 moradores desenhados em 2D, com quatro quadros de caminhada, incluindo 10 personagens selecionáveis: Homer, Marge, Bart, Lisa, Maggie, Apu, Krusty, Ned Flanders, Wiggum e Burns. Há 24 carros, ônibus escolar, três barcos, calçadas, faixas, sinaleiras e arborização.

Arraste para explorar, use a roda para aproximar e clique nos prédios ou personagens. **Explorar Springfield** permite buscar todos os 116 destinos, filtrar por atividade e enquadrar a cidade inteira. Os rótulos flutuantes destacam os locais principais; os demais continuam clicáveis e disponíveis na busca.

Cada destino prepara uma ação real:

- Casa: carteira, perfil e contas fixas.
- Usina e locais de trabalho: registrar salário recebido.
- Kwik-E-Mart / Apu: compras com vale-alimentação ou dinheiro.
- Krusty, Moe's e outros restaurantes: registrar refeição.
- Banco / Burns: reserva e meta de economia.
- Comércio, saúde, escola, lazer e transporte: registrar gastos com descrição do destino.
- Serviços cívicos: pagamentos; mansão: planejamento.

Visitar não movimenta saldos. A confirmação no formulário existente é necessária. Todos os locais usam o mesmo controle pessoal, sem inventários ou economias financeiras independentes. Não há interiores exploráveis, diálogos roteirizados, todas as construções da série ou simulação completa de trânsito.

## Finanças preservadas

Entradas, saídas fixas e diárias, perfil com salário e benefício, vale separado, metas mensais, reserva, histórico, previsões e backup JSON. Persistência local em garagem:personal:v1, sem alteração dos registros anteriores. A integração de login e banco remoto permanece futura.

Os cinco níveis residenciais continuam em src/homeJourney.ts. A cobertura de despesas por dinheiro + reserva libera marcos em 1, 3, 6 e 12 meses. A casa dos Simpsons e a cidade permanecem presentes em todos os níveis. O jardim ganha árvore e banco no nível 3. A maior conquista visual continua salva em garagem:vale:unlocked:v1.

## Estrutura e qualidade

- src/vale/cartoonLook.ts, cartoonFinish.ts, cartoonPeopleArt.ts: paleta, câmera, pintura cel, contornos e desenhos dos personagens.
- src/vale/springfieldLocations.ts: catálogo de locais e personagens.
- springfieldBuildings.ts, springfieldKit.ts: modelos próprios montados e agrupados por região/material, atlas de letreiros.
- springfieldPeople.ts, springfieldTraffic.ts: moradores e veículos com recursos compartilhados.
- springfieldCity.ts: cidade, terreno, oceano, barcos e seleção.
- springfieldActions.ts: ação financeira de cada tipo de destino.
- createVale.ts, Vale.tsx: câmera, navegação, busca, clima, rótulos, qualidade e renderização.
- src/engine: motor financeiro existente, preservado nesta alteração.

Visual cartoon com cores chapadas, duas faixas de sombra, contornos escuros e câmera ortográfica. Personagens desenhados em atlas 2D compartilhado. Água com traços animados, sem reflexos realistas. Sem PBR, HDRI, bloom ou desfoque de miniatura na cena ativa. Qualidade automática reduz resolução e antialiasing, preservando os contornos e a cidade. Meta de 60 fps em desktop, ainda sem benchmark de GPU. O proprietário realiza a avaliação visual e pediu para não abrir navegador. Build e testes de CPU não substituem essa avaliação.

Veja [orçamento visual](docs/visual-quality.md), [créditos](CREDITS.md) e [passagem de bastão](HANDOFF.md). Os módulos e modelos antigos da vila nórdica permanecem como legado, fora da cena ativa.

## Supabase futuro

O esquema está em supabase/migrations/0001_init.sql; .env.example contém as variáveis. A migração e o login ainda precisam de integração e validação em um projeto real.
