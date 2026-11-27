# Renders fotorrealistas por vista

Em vez de um render por material, cada vista tem poucos renders e em cada render mudam vários elementos ao mesmo tempo
(render 1: chão A + porta A + roupeiro A; render 2: chão B + porta B + roupeiro B). O site recorta cada elemento do render
que tem a opção escolhida, por isso todas as combinações funcionam. O render original conta como uma das opções.

Configuração: `data/variants.json` (por vista: imagens e, por componente, o produto do original e o render de cada opção).

Processo (exemplo da suíte):
1. Gerar o render por IA (KreatorFlow, Ideogram 4.6 edição precisa) a partir do panorama original, com as fotos dos produtos como referência.
2. `check.py base render masks/<vista> cmp.jpg` — alinhamento (deslocamento deve ser 0) e diferença fora das zonas.
3. `match.py base render masks/<vista> saida.webp` — iguala a cor ao original (usar só se a diferença baixar).
4. `unwall.py base render saida.webp` — se o render mudou a cor das paredes, devolve-lhes o tom original.
5. `NOEXT="x0,y0,x1,y1" refine.py base render.webp masks/<vista> <n> floor-dry interior-door wardrobe` — máscaras finais `<parte>@<n>.png`
   (máscara do elemento + píxeis vizinhos que mudaram nesse render; o chão tem prioridade; NOEXT exclui zonas, ex.: o WC visto pela porta).
