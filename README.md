# Garagem

Finanças pessoais em uma vila acolhedora. Cuide da sua casa, das contas do mês, do vale-alimentação e da reserva. Garagem permanece como nome de trabalho.

## Rodar

    npm install
    npm run dev      # app com dados de demonstração
    npm test         # testes do motor financeiro
    npm run build

## Ligar o Supabase

1. Crie um projeto no Supabase.
2. Rode `supabase/migrations/0001_init.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Estrutura

- `src/engine`: motor puro (sem dependências): burn, cenários, fôlego, pró-labore, estágio e alertas. Valores em centavos.
- `supabase/migrations`: esquema e RLS por workspace (PF ou PJ).
- `src/vale`: cena 3D do Vale (three.js), ligada à jornada da casa com os dados financeiros.
- `src/homeJourney.ts`: níveis residenciais e progresso por cobertura de despesas.
- `src/App.tsx`: painel "Hoje" sobre dados de demonstração.
- `HANDOFF.md`: contexto completo, decisões e próximos passos.

## Vale nórdico

A cena ativa é uma vila residencial inspirada em fiordes da Noruega e nas Ilhas Faroe. Casas de bairro do City Kit Suburban 2.0 substituem a arquitetura medieval: sobrados, garagens, portas e janelas maiores, quintais cercados e fachadas comerciais com toldos. O bairro inclui oito residências adicionais, praça, jardins e terraço do café. Casas, rochas e vegetação são de Kenney; o banco de praça é de Quaternius. Todos são CC0. Fontes e licenças em `CREDITS.md`.

`nordicVillage.ts` monta os destinos financeiros e compartilha superfícies entre objetos repetidos. `nordicTerrain.ts` cria encostas, margens e o terraço habitado. A cidade anterior permanece no histórico e no código legado, mas não é carregada pela cena ativa.

`fjordWater.ts` aplica profundidade costeira, reflexos, espuma e ondulações no material da água. `villageResidents.ts` anima 18 moradores em percursos ligados aos caminhos, com pausas e sacolas de compras. `fjordBoats.ts` monta um veleiro com velas curvas e um barco de porto, incluindo trajetos, balanço e esteira. Moradores compartilham geometrias e atualizam as poses a 15 Hz; água e barcos respeitam a preferência por movimento reduzido.

Os testes em `tests/nordicVillage.test.ts` decodificam os GLBs sem navegador, verificam arquivos de textura, os 11 destinos, cancelamento, falha de carregamento e o orçamento de geometria. Essas checagens não medem FPS nem substituem a avaliação visual no dispositivo.

O acabamento visual inclui HDRI local, correção de cor, SMAA/FXAA conforme o nível, bloom noturno e miniatura leve. O menu **Visual do vale** permite escolher qualidade automática/alta/média/baixa e prévia de dia/noite. A renderização mira 60 fps em desktop e adapta resolução e efeitos; desempenho em GPU integrada ainda precisa de medição no dispositivo.

Os estabelecimentos e as casas da vizinhança já estão presentes desde o começo. A casa do usuário recebe ampliações nos níveis 3 e 5, e a maior conquista visual fica preservada entre sessões. Veja [direção visual e orçamento](docs/visual-quality.md) e [créditos completos](CREDITS.md).

## Regras de estágio

Os nomes visíveis são Novo lar, Lar acolhedor, Casa com jardim, Lar completo e Vida tranquila. A cobertura das despesas mensais pelo dinheiro disponível e pela reserva libera os níveis em 1, 3, 6 e 12 meses. Essa apresentação fica em `src/homeJourney.ts` e não depende de imposto ou pró-labore. Os IDs internos antigos foram mantidos por compatibilidade; os cálculos de lançamentos e o motor financeiro permanecem intactos.
