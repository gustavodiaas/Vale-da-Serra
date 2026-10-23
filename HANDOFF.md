# Springfield: passagem de bastão

## Decisão visual mais recente

O proprietário rejeitou a grade procedural e o filtro cartoon. Foi gerada uma pintura de fã de Springfield com imagegen e ele respondeu: **Sim, seguir nessa direção**. Essa pintura é agora a base ativa. Não voltar a substituir as fachadas por caixas 3D, não inclinar a textura e não reaplicar filtros de contorno à arte.

Arquivo: public/art/springfield-illustrated-v1.png, 1536 × 1024, 3.849.177 bytes. Prompt em public/art/ART-PROMPT.md. Interpretação de fã, sem pretensão de cartografia canônica. Não chamar de modelo 3D ou mapa oficial. As personagens da série estão presentes na própria pintura e nos sprites adicionais.

## Fluxo do proprietário

Português brasileiro, sem travessão. Ele faz a avaliação visual e envia screenshots. Não abrir navegador, Playwright ou fazer captura de tela sem pedido posterior. Alterações verificadas podem ir diretamente a main de gustavodiaas/Vale-da-Serra. Push não comprova deploy Vercel.

## Implementação ativa

- illustratedSpringfield.ts monta uma textura sobre um plano Three.js, com uma câmera ortográfica diretamente acima dele. A imagem já contém a perspectiva desenhada; não adicionar outra.
- illustratedLayout.ts guarda as regiões medidas contra a pintura aprovada. São 116 destinos preservados do catálogo: 47 locais, 59 residências e dez personagens. Regiões secundárias são associações próprias a edifícios da composição, não uma alegação de fachada canônica.
- Os principais pontos foram associados à casa dos Simpsons, Flanders, Kwik-E-Mart, Krusty Burger, Moe's, Android's Dungeon, Lard Lad, escola, Bowlarama, Aztec, banco, prefeitura, mansão, igreja, lago e usina da ilustração.
- 32 sprites adicionais percorrem rotas manuais sobre os passeios. Cinco personagens permanecem próximos de seus destinos. Carros, barcos e pessoas pintados no fundo são estáticos, sem simulação veicular nesta versão.
- A seleção marca o destino, abre a ação e a busca enquadra sua região. Zoom e arraste preservados. Visão geral enquadra a composição inteira. A cena principal tem duas faces, mais os sprites e o marcador de seleção.
- createVale.ts preserva os métodos públicos, qualidade automática, instrumentação e limite de 60 quadros/s. Noite é uma tonalização da pintura; clima real permanece no cabeçalho. Sem HDRI, iluminação física, névoa, chuva 3D ou pós-processamento.
- Os níveis da casa continuam no HUD e salvos em garagem:vale:unlocked:v1. A pintura permanece íntegra em todos os estágios; não há ampliação visual de jardim nesta versão.
- Módulos anteriores springfieldCity.ts, arquitetura procedural, shaders cartoon e vila nórdica permanecem no repositório e nos testes como legado. Não confundir seus resultados de geometria com a cena ativa.

## Finanças e API

Não alterar src/engine ou testes existentes sem novo pedido. Dados compatíveis em garagem:personal:v1: centavos, entradas, fixas, diários, salário/benefício, vale separado, reserva, resgates, meta, histórico e backup. A imagem não grava dinheiro; ações passam pelos formulários existentes.

API preservada: setStage, setWeather, setLabel, zoom, reset, dispose, setQuality, setTimeOfDay, focusLocation, overview. Metadados de seleção preservados. Os cinco níveis residenciais continuam calculados por src/homeJourney.ts; IDs antigos são compatibilidade interna.

## Verificação e limites

61 testes aprovados. Os 58 anteriores permanecem intactos; três novos verificam a imagem, regiões, seleção, recursos e cancelamento de carregamento. Compilação de TypeScript/Vite aprovada. Nenhum navegador foi aberto. FPS e aparência integrada não foram medidos/verificados na GPU.

Não há interiores, diálogos, física de trânsito, todas as construções da série ou geometria independente por edifício da pintura. A precisão visual das regiões e a legibilidade ao ampliar precisam da conferência do proprietário.

Supabase e loja de moedas continuam futuros. Não alterar persistência nem executar migrações em ajustes visuais. A arte temática não é CC0; ver CREDITS.md.
