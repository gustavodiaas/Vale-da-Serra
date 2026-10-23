# Direção e orçamento visual

## Direção atual

Vila residencial costeira original inspirada na Noruega e nas Ilhas Faroe. O centro da experiência é uma casa comum e a vida pessoal. Os modelos medievais foram substituídos por casas do City Kit Suburban 2.0: paredes claras, telhados simples, garagens, sobrados e janelas maiores. Oito residências adicionais, quintais cercados, praça e fachadas com toldos completam o bairro. A câmera ficou mais próxima e baixa para mostrar as fachadas; rótulos secundários aparecem ao aproximar.

## Acabamento

- Ambiente HDRI CC0 de 1K com PMREM, iluminação hemisférica, sol direcional e sombras estáticas de 2048 px.
- PBR, ACES Filmic e saída sRGB. Tons quentes discretos, vinheta sutil e efeito leve de miniatura no nível alto. Os rótulos DOM e o HUD não são desfocados.
- Sombras de contato pré-calculadas em textura, sem SSAO de tela inteira.
- Alto: SMAA e bloom noturno. Médio: FXAA e correção de cor. Baixo: renderização direta com ACES/sRGB. Objetos e rotinas permanecem nos três níveis.
- Água com profundidade costeira, espuma e reflexos de ambiente. Não há reflexão de cena em tempo real.
- Sol orientado aproximadamente pelo relógio local, com atualização por minuto. Isso não é uma simulação astronômica da Noruega. O clima local continua via Open-Meteo. Sem clima disponível, dia/noite segue o relógio; o controle visual permite prévia manual.

## Progressão

Os 11 destinos financeiros continuam com os mesmos IDs internos, sem expor a linguagem antiga de startup. A vizinhança já está ocupada no começo. A casa do usuário recebe ampliações nos níveis 3 e 5; a maior conquista visual fica salva em `garagem:vale:unlocked:v1`. O nível exibido é calculado em `src/homeJourney.ts`: dinheiro + reserva, dividido pela estimativa mensal de despesas. Os marcos de 1, 3, 6 e 12 meses liberam Novo lar, Lar acolhedor, Casa com jardim, Lar completo e Vida tranquila. Essa apresentação não exige imposto provisionado ou pró-labore e não altera os saldos nem os cálculos do motor.

## Desempenho

Meta: 60 fps em desktop, sem garantia por GPU. O limite antigo de 30 fps foi removido. A adaptação ignora carregamento, primeiros três segundos e mudanças de aba; reduz um nível abaixo de 50 fps médios e só recupera qualidade após cinco janelas estáveis acima de 57 fps. Cada janela dura aproximadamente 2,2 s. Seleção manual não é sobrescrita.

| Nível | DPR máximo | Orçamento de pixels | Tratamento |
| --- | ---: | ---: | --- |
| Alto | 1,5 | 3,6 milhões | SMAA, cor, miniatura leve, bloom noturno |
| Médio | 1,1 | 2,1 milhões | FXAA e cor |
| Baixo | 0,85 | 1,4 milhão | ACES e sRGB, sem pós-processamento |

Os limites de pixels reduzem a resolução interna em monitores maiores. A preferência por movimento reduzido mantém a cena e pausa suas animações. Moradores usam instâncias e poses a 15 Hz; o vento e a água são animados por shader.

Orçamento de geometria: menos de 250 mil triângulos e 80 malhas, incluindo ampliações da casa. Medição CPU atual: **205.557 triângulos, 65 malhas**, modelos GLB somando **710.904 bytes**, mais **1.475.077 bytes** do HDRI. Caminhos e casas decorativas são agrupados por superfície. Malhas não equivalem a draw calls; sombras e pós-processamento acrescentam chamadas.

Meta de chamadas: até 140 por quadro estável no nível alto; quadros que recalculam sombras podem exceder essa meta. A instrumentação grava `data-fps`, `data-draw-calls`, `data-triangles` e `data-quality` no canvas depois do aquecimento. São observações do navegador em uso, não um benchmark de laboratório. FPS de GPU integrada e chamadas reais **ainda não foram medidos nesta entrega**.

## Verificação e limites

O proprietário manteve a validação visual e pediu para não abrir o navegador. Por isso não foram executados Playwright, screenshots dos cinco estágios ou medições de GPU. Build, os 50 testes existentes, decodificação do HDRI e simulações do controlador de qualidade foram usados como verificações locais. Nenhum arquivo em `src/engine` ou teste existente foi alterado.

Ficaram de fora nesta adaptação:

- Draco/meshopt/KTX2: os modelos locais somam aproximadamente 0,71 MB, com cores do atlas incorporadas nos vértices das casas. Não foi adicionado o custo de decodificadores sem medição que justificasse isso.
- SSAO/N8AO, névoa volumétrica e profundidade de campo física: usados contato pré-calculado, neblina da cena e miniatura leve para controlar passes e preservar legibilidade.
- Asfalto, ônibus, palmeiras e torre de vidro: pertenciam à direção californiana do prompt antigo. A vila nórdica mantém pedestres, vegetação local e barcos.
- Prédios corporativos e arquitetura medieval: a direção atual é residencial. Os IDs antigos do motor e do mapa permanecem internos para manter compatibilidade, sem definir a linguagem do produto.
