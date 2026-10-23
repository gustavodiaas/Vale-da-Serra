# Springfield pessoal

Recriação de fã de Springfield em Three.js para organizar finanças pessoais. A casa dos Simpsons é o lar do usuário. Projeto pessoal, não oficial, anteriormente chamado Garagem / Vale da Serra.

## Rodar

    npm install
    npm run dev
    npm test
    npm run build

## A cidade

116 destinos financeiros: 47 locais nomeados, 59 residências e 10 personagens, com regiões de interação sobre o mapa ilustrado aprovado pelo proprietário. Inclui Evergreen Terrace, Kwik-E-Mart, Krusty Burger, Moe's, Lard Lad, escola, banco, biblioteca, prefeitura, hospital, igreja, usina nuclear, Duff, mansão Burns, estádio, lago, Krustyland, aeroporto e porto. A disposição é uma composição para este aplicativo, não um mapa canônico de todos os episódios.

32 moradores desenhados em 2D, com quatro quadros de caminhada, incluindo 10 personagens selecionáveis: Homer, Marge, Bart, Lisa, Maggie, Apu, Krusty, Ned Flanders, Wiggum e Burns. Carros, ônibus, barcos e parte da população pertencem à pintura estática; os 32 sprites são uma camada animada separada.

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

Os cinco níveis residenciais continuam em src/homeJourney.ts. A cobertura de despesas por dinheiro + reserva libera marcos em 1, 3, 6 e 12 meses. A casa dos Simpsons e a cidade permanecem presentes em todos os níveis. Os marcos permanecem no HUD; a pintura aprovada não é deformada nem reconstruída em cada estágio. A maior conquista visual continua salva em garagem:vale:unlocked:v1.

## Estrutura e qualidade

- public/art/springfield-illustrated-v1.png: arte de fã gerada com imagegen e aprovada pelo proprietário, 1536 × 1024.
- illustratedLayout.ts: regiões de interação ajustadas à pintura, conversão de coordenadas e enquadramento.
- illustratedSpringfield.ts: pintura como textura Three.js, seleção, personagens e descarte.
- createVale.ts, Vale.tsx: câmera ortográfica vista de frente para a arte, zoom, arraste, busca, rótulos e qualidade automática.
- springfieldLocations.ts, springfieldActions.ts: catálogo e ações financeiras preservados.
- cartoonPeopleArt.ts: atlas compartilhado dos personagens animados.
- Os módulos de arquitetura procedural e a vila nórdica permanecem como legado para comparação e testes; não são carregados pela cena ativa.

A pintura é apresentada diretamente, sem filtros de contorno adicionais, cel shading, perspectiva, HDRI, bloom ou desfoque. O modo noturno aplica uma tonalização; não redesenha as janelas. O clima continua no cabeçalho, sem precipitação sobre a ilustração. Qualidade automática ajusta a resolução, preservando a arte e as interações.

São 61 testes, incluindo os testes anteriores sem alteração. O proprietário pediu para avaliar o site e enviar screenshots, sem abrir navegador. Testes de CPU e compilação não comprovam a aparência final ou FPS. Não há benchmark de GPU nesta entrega.

Veja [direção visual](docs/visual-quality.md), [créditos](CREDITS.md) e [passagem de bastão](HANDOFF.md).

## Supabase futuro

O esquema está em supabase/migrations/0001_init.sql; .env.example contém as variáveis. A migração e o login ainda precisam de integração e validação em um projeto real.
