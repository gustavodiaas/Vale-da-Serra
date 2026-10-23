# Direção e orçamento visual

## Direção atual

Vale costeiro original inspirado na Noruega e nas Ilhas Faroe. Casinhas de madeira, telhados verdes e terrosos, caminhos claros, encostas suaves, vegetação variada e água azul-esverdeada. O prompt antigo de Silicon Valley foi adaptado a esta direção; a vila não foi substituída por uma cidade californiana.

## Acabamento

- Ambiente HDRI CC0 de 1K com PMREM, iluminação hemisférica, sol direcional e sombras estáticas de 2048 px.
- PBR, ACES Filmic e saída sRGB. Tons quentes discretos, vinheta sutil e efeito leve de miniatura no nível alto. Os rótulos DOM e o HUD não são desfocados.
- Sombras de contato pré-calculadas em textura, sem SSAO de tela inteira.
- Alto: SMAA e bloom noturno. Médio: FXAA e correção de cor. Baixo: renderização direta com ACES/sRGB. Objetos e rotinas permanecem nos três níveis.
- Água com profundidade costeira, espuma e reflexos de ambiente. Não há reflexão de cena em tempo real.
- Sol orientado aproximadamente pelo relógio local, com atualização por minuto. Isso não é uma simulação astronômica da Noruega. O clima local continua via Open-Meteo. Sem clima disponível, dia/noite segue o relógio; o controle visual permite prévia manual.

## Progressão

Os 11 destinos financeiros continuam com os mesmos IDs. Lotes ainda não liberados mostram tapumes, materiais e rótulo de obra. O QG conserva a casa original e recebe anexos no mesmo terreno nos estágios 3 e 5. As outras liberações mantêm a distribuição da vila. O maior estágio visual fica salvo em `garagem:vale:unlocked:v1`; oscilações do caixa não apagam conquistas. O estágio financeiro do HUD continua refletindo o motor atual.

## Desempenho

Meta: 60 fps em desktop, sem garantia por GPU. O limite antigo de 30 fps foi removido. A adaptação ignora carregamento, primeiros três segundos e mudanças de aba; reduz um nível abaixo de 50 fps médios e só recupera qualidade após cinco janelas estáveis acima de 57 fps. Cada janela dura aproximadamente 2,2 s. Seleção manual não é sobrescrita.

| Nível | DPR máximo | Orçamento de pixels | Tratamento |
| --- | ---: | ---: | --- |
| Alto | 1,5 | 3,6 milhões | SMAA, cor, miniatura leve, bloom noturno |
| Médio | 1,1 | 2,1 milhões | FXAA e cor |
| Baixo | 0,85 | 1,4 milhão | ACES e sRGB, sem pós-processamento |

Os limites de pixels reduzem a resolução interna em monitores maiores. A preferência por movimento reduzido mantém a cena e pausa suas animações. Moradores usam instâncias e poses a 15 Hz; o vento e a água são animados por shader.

Orçamento de geometria: menos de 250 mil triângulos e 80 malhas, incluindo todos os estágios e obras. Medição CPU atual: **237.564 triângulos, 78 malhas**, modelos GLB somando **1.746.392 bytes**, mais **1.475.077 bytes** do HDRI. Malhas não equivalem a draw calls; sombras e pós-processamento acrescentam chamadas.

Meta de chamadas: até 140 por quadro estável no nível alto; quadros que recalculam sombras podem exceder essa meta. A instrumentação grava `data-fps`, `data-draw-calls`, `data-triangles` e `data-quality` no canvas depois do aquecimento. São observações do navegador em uso, não um benchmark de laboratório. FPS de GPU integrada e chamadas reais **ainda não foram medidos nesta entrega**.

## Verificação e limites

O proprietário manteve a validação visual e pediu para não abrir o navegador. Por isso não foram executados Playwright, screenshots dos cinco estágios ou medições de GPU. Build, os 50 testes existentes, decodificação do HDRI e simulações do controlador de qualidade foram usados como verificações locais. Nenhum arquivo em `src/engine` ou teste existente foi alterado.

Ficaram de fora nesta adaptação:

- Draco/meshopt/KTX2: os modelos locais já somam aproximadamente 1,75 MB e não usam grandes mapas de textura. Não foi adicionado o custo de decodificadores sem medição que justificasse isso.
- SSAO/N8AO, névoa volumétrica e profundidade de campo física: usados contato pré-calculado, neblina da cena e miniatura leve para controlar passes e preservar legibilidade.
- Asfalto, ônibus, palmeiras e torre de vidro: pertenciam à direção californiana do prompt antigo. A vila nórdica mantém pedestres, vegetação local e barcos.
- Novos packs de prédios: os GLBs CC0 atuais foram reutilizados; esta etapa melhora iluminação, progressão e acabamento, sem substituir silenciosamente a direção arquitetônica.
