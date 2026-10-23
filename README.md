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

## Regras de estágio

Garagem: fôlego abaixo de 1 mês. Pré-seed: 1 a 2 meses. Seed: 3 meses e imposto separado. Série A: 6 meses e 3 meses seguidos no azul. Unicórnio: 12 meses e pró-labore por 6 meses seguidos.
