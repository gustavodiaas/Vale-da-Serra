# Direção e orçamento visual

## Direção atual: desenho cartoon

O proprietário rejeitou o aspecto de maquete 3D e pediu desenho como os Simpsons. A cidade continua em Three.js, mas a apresentação é ilustrada: câmera ortográfica, cores vivas, duas faixas discretas de sombra, contornos escuros e personagens efetivamente desenhados em 2D.

106 destinos físicos e 10 personagens selecionáveis. As finanças, o catálogo, a busca, a navegação, o clima e os cinco estágios foram preservados.

## Renderização

- cartoonLook.ts: pintura MeshBasicMaterial com sombreamento cel próprio. Sem iluminação PBR, reflexos, HDRI, ACES ou sombras projetadas. O normal da superfície escolhe somente entre a cor cheia e uma faixa com fator 0,78.
- Paleta explícita para pele amarela, roupas, casa dos Simpsons, Flanders, Kwik-E-Mart, vegetação, asfalto e janelas. Demais cores recebem saturação maior.
- cartoonFinish.ts: contornos a partir das diferenças de cor, com espessura em pixels de CSS. Alto/médio acrescentam FXAA; baixo mantém pintura e contornos. Sem bloom, vinheta, color grading ou desfoque.
- Câmera ortográfica e zoom por enquadramento, sem redução de escala pela distância. Arraste ajustado ao tamanho da tela e à inclinação da câmera.
- cartoonPeopleArt.ts: 12 desenhos, quatro poses cada, em um atlas Canvas2D 512 × 3072. 32 moradores usam Sprite com textura compartilhada e materiais por quadro. Animação e seleção continuam disponíveis. A arte é uma interpretação de fã produzida no código.
- Água azul chapada com traços ondulados e linha costeira animados, sem reflexos ou mapa de profundidade.
- Dia/noite por paleta compartilhada, janelas amarelas à noite. Clima ainda afeta céu e precipitação. Movimento reduzido pausa a animação; aba oculta pausa renderização.
- HUD com fundos sólidos, bordas escuras e cores da cidade, sem efeito de vidro.

## Orçamento e limites da verificação

Medição CPU: **51 malhas, 332.950 triângulos de malhas e 32 sprites**. Os sprites acrescentam 64 triângulos, totalizando aproximadamente 333 mil. Volumes invisíveis de seleção não entram na renderização. A versão anterior tinha 86 malhas e 412.880 triângulos.

Contornos custam um passe de tela inteira. Não há um passe de sombra nem HDRI para carregar. O alvo continua em 60 fps, sem garantia de desempenho: **FPS e chamadas reais ainda não foram medidos na GPU**.

| Nível | DPR máximo | Pixels internos | Acabamento |
| --- | ---: | ---: | --- |
| Alto | 1,5 | 3,6 milhões | Pintura + contornos + FXAA |
| Médio | 1,1 | 2,1 milhões | Pintura + contornos + FXAA |
| Baixo | 0,85 | 1,4 milhão | Pintura + contornos |

O detector de qualidade ignora carregamento e aquecimento, reduz um nível abaixo de 50 fps médios e recupera depois de cinco janelas acima de 57 fps. A escolha manual é preservada. Nenhum destino é retirado para reduzir qualidade.

Os 58 testes cobrem finanças, catálogo, seleção, rotas, câmera ortográfica, atlas compartilhado e alterações dos shaders de Three.js. Não compilam shaders em GPU nem verificam o Canvas2D visualmente. O proprietário pediu para avaliar o site e enviar screenshots, sem abrir navegador automaticamente.

Conferir principalmente leitura dos contornos, cores, desenhos e caminhada dos personagens, seleção ao aproximar, visão geral, modo noturno e desempenho. Não há interiores, diálogos ou simulação viária completa.
