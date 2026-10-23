# Garagem: passagem de bastão

Nome provisório (exige busca de marca no INPI). Finanças gamificadas para MEI e autônomo com renda irregular. **Produto para computador (desktop first)**, no estilo do moneyville.app, mas com conceito, nome, texto e arte 100% originais. Nunca copiar assets, frases ou personagens deles nem de empresas reais.

## Conceito
O usuário é fundador de uma startup no "Vale" (universo Silicon Valley genérico). Começa numa garagem e a cidade em 3D evolui até um campus com torre. Vocabulário: runway = fôlego do caixa, burn = custo mensal, pró-labore = salário do fundador, imposto = compliance provisionado, metas = marcos, alertas = Conselho, moedas = equity. Tom brasileiro.

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

## Estado atual (v0.2)
- `src/engine`: motor puro, 15 testes (vitest). Mexeu no motor, mexeu no teste.
- `supabase/migrations/0001_init.sql`: esquema da Fase 1, RLS por workspace, funções is_member/can_write/is_owner, RPC create_workspace.
- `src/vale`: cena 3D procedural (sem assets externos). `createVale.ts` é three puro; `Vale.tsx` liga ao estágio do motor. Carregada com lazy import.
- `src/App.tsx`: painel Hoje (Vale à esquerda, números à direita) com dados de demonstração.
- `docs/vale-preview-standalone.html`: a primeira versão da cena em HTML único (three r128), só como referência.

## Avisos honestos
- A migração SQL **não foi executada** em um Supabase real. Rodar e corrigir primeiro.
- A cena 3D **não foi conferida visualmente** em navegador depois do port para o three moderno. As luzes usam intensidade multiplicada por PI (luzes fisicamente corretas); se estiver escuro ou lavado, ajustar em `createVale.ts`.
- O 3D precisa ficar leve: poucas formas, sem modelos pesados, e um fallback 2D quando o WebGL falhar (hoje `createVale` retorna null e o canvas fica vazio).

- O clima real (Open-Meteo, sem chave) afeta céu, luz, neblina e chuva/neve no Vale (`src/vale/weather.ts`). Também não foi conferido visualmente.

## Fluxo de trabalho do dono
Sem VS Code e sem Node local. O dono recebe os arquivos, sobe no GitHub e o deploy é na Vercel (o build roda `tsc --noEmit && vite build`, então qualquer erro de tipo derruba o deploy). Quem edita o código precisa revisar os tipos com cuidado. Supabase fica para depois: primeiro o site no ar, rodando liso, com dados de demonstração.

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
