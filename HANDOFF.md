# Garagem: passagem de bastão

Nome provisório (exige busca de marca no INPI). Finanças gamificadas para MEI e autônomo com renda irregular. **Produto para computador (desktop first)**, no estilo do moneyville.app, mas com conceito, nome, texto e arte 100% originais. Nunca copiar assets, frases ou personagens deles nem de empresas reais.

## Conceito
O usuário é fundador de uma startup em um vale costeiro original inspirado na Noruega e nas Ilhas Faroe. A direção californiana foi substituída por uma vila cozy, com casas de madeira, fiorde, encostas, moradores e barcos. A progressão conserva a garagem original, acrescenta anexos ao QG e libera destinos na vila. Vocabulário: runway = fôlego do caixa, burn = custo mensal, pró-labore = salário do fundador, imposto = compliance provisionado, metas = marcos, alertas = Conselho, moedas = equity. Tom brasileiro.

## Diferencial
O motor financeiro, não a skin: fôlego do caixa, previsão em 3 cenários (mês ruim, provável, bom), pró-labore sugerido, separação PF e PJ, imposto separado a cada entrada. A gamificação serve ao motor.

## Estágios (regra em `src/engine/engine.ts`, função `stageFor`)
- Garagem: fôlego abaixo de 1 mês
- Pré-seed: 1 a 2 meses
- Seed: 3 meses e imposto separado
- Série A: 6 meses e 3 meses seguidos no azul
- Unicórnio: 12 meses e pró-labore por 6 meses seguidos

O prédio e as conquistas nunca se perdem. O selo atual reflete o caixa de hoje.

## Planos (hipóteses)
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
- Lotes bloqueados aparecem em obras. O maior estágio visual é salvo em `garagem:vale:unlocked:v1`; conquistas não regridem com o caixa. Os cálculos e o estágio financeiro continuam no motor original.
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
