# Direção visual aprovada: mapa ilustrado

A grade de modelos procedurais e seu contorno pós-processado foram rejeitados. O proprietário aprovou uma pintura de Springfield gerada com imagegen, agora exibida diretamente no site. A identidade está nas fachadas e na composição da arte, não em um filtro sobre blocos.

## Cena ativa

- PNG local de 1536 × 1024, 3.849.177 bytes, textura sRGB num plano de duas faces Three.js.
- Câmera ortográfica alinhada à imagem, sem perspectiva ou inclinação adicionais.
- Sem PBR, HDRI, sombra, tone mapping, desfoque, bloom ou filtro de tinta.
- 116 regiões interativas; nove rótulos principais; zoom, arraste, busca e visão geral.
- 32 sprites de moradores, atlas compartilhado, poses a 20 Hz. Eles complementam os personagens estáticos pintados no fundo. Carros e barcos da pintura não se movem.
- Marcador anelar para seleção. Noite é uma tonalização, sem redesenho das janelas ou do céu.
- Os marcos financeiros permanecem; não há reconstrução da arte por estágio.

## Desempenho

A base da cidade custa uma malha de duas faces. Os sprites acrescentam 32 chamadas e 64 triângulos; o marcador, quando visível, acrescenta uma chamada. Não há pós-processamento ou passe de sombras. Isso é orçamento de geometria, não medição de GPU.

DPR e orçamento de pixels continuam automáticos: alto 1,5 / 3,6 milhões; médio 1,1 / 2,1 milhões; baixo 0,85 / 1,4 milhão. Alvo de 60 quadros/s, animação reduzida e pausa em aba oculta. FPS real e draw calls observadas no dispositivo ainda não foram medidos.

## Verificação

61 testes e compilação aprovados, sem alterar testes anteriores. A imagem foi inspecionada na saída da ferramenta e aprovada pelo usuário. O site integrado não foi aberto, conforme pedido dele. Os testes verificam dimensões da imagem, todas as regiões, seleção, carregamento, cancelamento e movimento dos sprites, além das finanças anteriores.

Conferir no dispositivo: alinhamento das regiões com fachadas, nitidez ao aproximar, enquadramento inicial e geral, rótulos, modo noturno, interação com personagens e fluidez. A imagem é uma composição de fã e regiões secundárias não garantem fachada canônica. Não há interiores ou simulação completa de cidade.
