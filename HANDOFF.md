# Garagem: passagem de bastão

Nome provisório. Finanças pessoais gamificadas em uma vila residencial. **Produto para computador (desktop first)**, com conceito, texto e arte originais. Usar apenas assets com licença compatível e fonte documentada.

## Conceito
O usuário é morador de uma casa comum em um vale costeiro inspirado na Noruega e nas Ilhas Faroe. A orientação mais recente é uma vila residencial acolhedora, com casas de bairro, garagens, sobrados, quintais e janelas grandes. A arquitetura medieval e as cabanas foram substituídas pelo Kenney City Kit Suburban 2.0. A progressão amplia a própria casa. Vocabulário visível: casa, lar, reserva, contas da casa, conquistas, avisos e moedas. Não apresentar a pessoa como fundador nem usar pré-seed, campus, sede ou equity na interface.

## Diferencial
Entradas, contas fixas, gastos diários, vale-alimentação separado, salário previsto, meta mensal de economia e reserva. A casa e a vila acompanham a organização financeira, com moradores caminhando, barcos e comércio local.

## Níveis da casa (`src/homeJourney.ts`)
- Novo lar: cobertura abaixo de 1 mês
- Lar acolhedor: pelo menos 1 mês
- Casa com jardim: pelo menos 3 meses
- Lar completo: pelo menos 6 meses
- Vida tranquila: pelo menos 12 meses

A cobertura considera dinheiro + reserva dividido pela estimativa de despesas mensais. Os nomes antigos de estágio permanecem como IDs internos para compatibilidade. O motor original, incluindo `stageFor`, não foi alterado, mas a apresentação residencial não depende dos critérios antigos de imposto e pró-labore.

O prédio e as conquistas nunca se perdem. O selo atual reflete o caixa de hoje.

## Planos antigos (hipóteses históricas, não implementados)
Garagem grátis permanente (decidido), Startup R$ 24,90/mês, Scale R$ 44,90/mês. Startup: PF e PJ, 3 cenários, imposto provisionado, metas, cartões. Scale: IA para comprovantes, contador ou sócio convidado, relatórios.

## Stack
Vite + React + TypeScript (sem SSR), Supabase (Postgres, Auth por código no e-mail e Google, RLS, Edge Functions), three.js para o Vale. Cobrança por Mercado Pago ou Stripe (a decidir). Dinheiro sempre em centavos. Sem senha de banco, nunca.

## Estado atual (23/10/2026)
- 50 testes existentes em Vitest, incluindo motor, modelos, relevo, água e rotinas. Nesta adaptação do prompt visual, nenhum arquivo do motor ou teste foi alterado.
- `src/engine`: motor puro. A UI atual inclui entradas, contas fixas, gastos diários, carteira de alimentação e meta de economia, com persistência local e backup JSON.
- `supabase/migrations/0001_init.sql`: esquema da Fase 1, RLS por workspace, funções is_member/can_write/is_owner, RPC create_workspace.
- `src/vale`: cena Three.js com modelos GLB CC0 locais, HDRI CC0, PBR, água com shader, pedestres e barcos. `createVale.ts` controla câmera, clima, progressão e renderização; `Vale.tsx` liga ao motor. Carregada com lazy import.
- API pública preservada: `setStage`, `setWeather`, `setLabel`, `zoom`, `reset`, `dispose`. Acrescentadas opções de qualidade e horário da cena. O prompt antigo citava nomes que não existem nesta versão; não renomear métodos usados pelo app.
- Pós-processamento escalável em `valeFinish.ts`; alvo desktop de 60 fps e níveis automáticos em `desktopQuality.ts`. Sem promessa de FPS medido.
- Os estabelecimentos e as casas vizinhas estão presentes desde o começo. A casa principal recebe ampliações nos níveis 3 e 5. O maior estágio visual continua salvo em `garagem:vale:unlocked:v1`; oscilações financeiras não apagam a casa já conquistada.
- Modelos residenciais adaptados por `scripts/prepare-residential.mjs`, com cores do atlas convertidas em vértices. Correspondência de tipos e licenças em `CREDITS.md`. Casas decorativas e caminhos são agrupados para controlar chamadas de desenho.
- `src/App.tsx`: HUD financeiro em português, sobre o vale. O controle "Visual do vale" permite comparar qualidade e dia/noite sem afetar finanças ou clima real do cabeçalho.
- Fontes e licenças em `CREDITS.md`. Direção, orçamento, critérios automáticos e limites em `docs/visual-quality.md`.
- `docs/vale-preview-standalone.html`: a primeira versão da cena em HTML único (three r128), só como referência.

## Avisos honestos
- A migração SQL **não foi executada** em um Supabase real. Rodar e corrigir primeiro.
- A validação visual continua com o proprietário, que pediu para não abrir navegador. Não executar Playwright ou gerar screenshots sem uma autorização direta posterior. Compilação e testes de CPU não comprovam iluminação, pós-processamento ou desempenho na GPU.
- A cena deve manter o conteúdo nos três níveis de qualidade, reduzindo resolução interna e efeitos quando necessário. Sem WebGL, há aviso amigável e os menus financeiros permanecem disponíveis.

- O clima real (Open-Meteo, sem chave) afeta céu, luz, neblina e chuva/neve no Vale (`src/vale/weather.ts`). Também não foi conferido visualmente.

## Fluxo de trabalho do dono
O proprietário faz os testes visuais e manda screenshots. Atualizações validadas podem ser enviadas diretamente ao `main` de `gustavodiaas/Vale-da-Serra`. O deploy é na Vercel; enviar ao GitHub não confirma sucesso do deploy. O build roda `tsc --noEmit && vite build`. Supabase fica para depois; preservar os dados financeiros locais e as funções existentes.

## Próximos passos
1. Rodar a migração em um projeto Supabase e corrigir o que falhar.
2. Login (código no e-mail e Google) e criação do workspace (RPC create_workspace).
3. Lançamento em um toque ligado ao banco, com atalhos de teclado (é desktop).
4. Painel Hoje lendo dados reais e gravando `forecast_snapshots`.
5. Imposto provisionado, contas recorrentes, metas, Conselho.
6. Fase 2: moedas (ledger só de inserção, com limite diário), missões, check-in, fechamento mensal, loja de personalização do Vale.
7. Depois: importação de extrato (OFX, CSV, PDF), leitura de comprovante por IA, contador e sócio convidados, open finance.

## Regras de trabalho
Dono do projeto é o único testador por enquanto. Responder em português do Brasil, direto, com opinião firme. Sem travessão (em dash) nos textos. Nenhum nome, logo ou personagem de terceiros na arte ou no texto.

## Rodar
    npm install
    npm run dev
    npm test
    npm run build
