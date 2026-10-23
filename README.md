# Garagem

Finanças para MEI e autônomo, contadas como a história de uma startup. Nome de trabalho.

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
- `src/vale`: cena 3D do Vale (three.js), ligada ao estágio do motor.
- `src/App.tsx`: painel "Hoje" sobre dados de demonstração.
- `HANDOFF.md`: contexto completo, decisões e próximos passos.

## Vale nórdico

A cena ativa é uma primeira vila inspirada em fiordes da Noruega e nas Ilhas Faroe. Casas e móveis são modelos GLB de Quaternius; rochas e vegetação são de Kenney, todos CC0. Fontes e licença estão em `public/models/nordic/CREDITS.md`. Os arquivos são servidos pelo próprio site.

`nordicVillage.ts` monta os destinos financeiros e compartilha superfícies entre objetos repetidos. `nordicTerrain.ts` cria encostas, margens e o terraço habitado. A cidade anterior permanece no histórico e no código legado, mas não é carregada pela cena ativa.

Os testes em `tests/nordicVillage.test.ts` decodificam os GLBs sem navegador, verificam arquivos de textura, os 11 destinos, cancelamento, falha de carregamento e o orçamento de geometria. Essas checagens não medem FPS nem substituem a avaliação visual no dispositivo.

## Regras de estágio

Garagem: fôlego abaixo de 1 mês. Pré-seed: 1 a 2 meses. Seed: 3 meses e imposto separado. Série A: 6 meses e 3 meses seguidos no azul. Unicórnio: 12 meses e pró-labore por 6 meses seguidos.
