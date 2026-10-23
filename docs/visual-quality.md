# Direção e orçamento visual

## Springfield

Recriação de fã em 3D: casa dos Simpsons, bairros residenciais, comércio, centro cívico, indústrias, parques e litoral. 106 destinos físicos e 10 personagens selecionáveis. Composição própria, sem reivindicar um mapa canônico.

Fachadas com janelas, beirais, portas, jardins, letreiros, monumentos, torres de refrigeração e mascotes. Letreiros compartilham atlas local 1024 × 2048. Cores por vértice, peças compartilhadas, objetos agrupados por região/material e instâncias para partes dos moradores e carros. A cena ativa não baixa GLBs.

## Renderização

- PBR, HDRI CC0 local de 1K com PMREM, sol, hemisfério, ACES e sRGB.
- Sombras estáticas 2048 px. Moradores e trânsito não lançam sombras dinâmicas. Não há SSAO nem oclusão de contato nesta versão.
- Alto: SMAA, cor, miniatura suave, bloom noturno. Médio: FXAA e cor. Baixo: ACES/sRGB sem pós-processamento.
- Sol e janelas respondem ao horário; prévia dia/noite disponível. Céu e precipitação respondem ao clima local, sem astronomia precisa.
- Água costeira com profundidade, espuma e ondulação. Reflexo do ambiente, sem reflexão da cidade em tempo real. Lago interno estático.
- Pessoas, veículos e barcos atualizam poses a 20 Hz. Renderização mira 60 fps. Movimento reduzido pausa animações; aba oculta pausa renderização.
- Na visão geral, a faixa de neblina acompanha a distância da câmera.

## Orçamento

Validação CPU atual: **86 malhas de renderização, 412.880 triângulos**, incluindo instâncias de personagens e veículos. Volumes invisíveis de seleção não entram nas chamadas de renderização. Testes limitam a cena a menos de 100 malhas e 500 mil triângulos. Isso não mede FPS ou draw calls na GPU.

Meta: até 150 chamadas em quadro estável no nível alto. Recalcular sombras e pós-processamento acrescentam chamadas. O canvas expõe data-fps, data-draw-calls, data-triangles e data-quality após aquecimento. **Chamadas reais e desempenho em GPU integrada não foram medidos nesta entrega.**

| Nível | DPR máximo | Pixels internos |
| --- | ---: | ---: |
| Alto | 1,5 | 3,6 milhões |
| Médio | 1,1 | 2,1 milhões |
| Baixo | 0,85 | 1,4 milhão |

O detector ignora o carregamento e os três segundos iniciais. Reduz um nível abaixo de 50 fps médios e sobe depois de cinco janelas acima de 57 fps; janelas de aproximadamente 2,2 segundos. Seleção manual preservada. Nenhum destino é retirado para reduzir qualidade.

## Conferência pelo proprietário

Build e testes sem navegador verificam recursos, rotas, seleção, catálogo e ações. Não comprovam qualidade visual, iluminação, shaders ou fluidez. O proprietário pediu para avaliar e enviar screenshots; não abrir navegador automaticamente.

Conferir a casa inicial, busca, visão geral, letreiros, Kwik-E-Mart com vale, salário na usina, banco, destinos cívicos, dia/noite e arraste. Interiores, diálogos e trânsito com regras completas não estão implementados.
