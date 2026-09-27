# Receitas — layouts e prompts para a Kindo

Modelos prontos para adaptar. Troque tema, data, produto e cores conforme o
pedido. Os prompts vão literalmente ao modelo, então revise antes de enviar.

## Fórmula de prompt (inglês)

```
[assunto principal, quantidade exata de objetos] on [superfície/cenário],
[materiais e texturas], [luz: direção, dureza, cor], [câmera: distância,
ângulo, lente], [paleta em palavras + hex], [composição: onde fica o
assunto e onde fica o espaço vazio para o texto], editorial product
photography, high detail, no text, no letters, no logos, no watermark.
```

Regras que evitam retrabalho:

- Diga a **quantidade** ("one perfume bottle"). Sem isso o modelo duplica.
- Nomeie a superfície e a luz. "Beautiful background" gera clichê.
- Reserve o espaço do texto: "lower third empty and dark", "left half
  empty, soft out-of-focus background".
- Se houver `reference_images`, comece o prompt com o que preservar:
  "Use the bottle from the reference image exactly as it is (shape, label,
  cap, colors). Only change the scene: …".
- Termine sempre com "no text, no letters, no logos, no watermark".

## Prompts por situação

**Perfume hero (fundo plum, story ou feed retrato)**
```
One perfume bottle from the reference image, exactly preserved, standing on
a polished dark plum stone surface (#3A1238) with soft magenta rim light
(#D6246E) from the upper left and a faint lilac glow (#EADCF4) behind it,
subtle golden reflections, shallow depth of field, 85mm lens, eye level,
bottle centered in the upper 60% of the frame, lower third empty and dark
for typography, luxury editorial product photography, high detail, no text,
no letters, no logos, no watermark.
```

**Kit de cuidados / vários produtos (feed quadrado)**
```
Three skincare products from the reference images, exactly preserved, arranged
in a loose triangle on white linen with a sprig of eucalyptus, bright soft
daylight from a window on the right, gentle shadows, top-down 45 degree
angle, pastel lilac and cream palette, right third of the frame empty for
typography, clean editorial flat lay, high detail, no text, no letters, no
logos, no watermark.
```

**Fundo abstrato sem produto (Segunda do Preço de Custo, texto grande)**
```
Abstract background of flowing satin fabric in deep plum (#3A1238) and
magenta (#D6246E) with a few small floating golden yellow paper price tags
(#FFE45C) with a punched hole and string, blurred, soft studio light,
center of the frame calm and dark so large headline text can sit on it,
premium retail campaign backdrop, no text, no letters, no numbers, no
logos, no watermark.
```

**Proteção solar / verão (story)**
```
One sunscreen bottle from the reference image, exactly preserved, standing
in shallow turquoise water on wet sand, strong afternoon sun from behind
creating sparkle on the water, warm highlights, low camera angle, vertical
composition with the bottle in the lower half and clear sky in the upper
half for typography, summer editorial product photography, high detail, no
text, no letters, no logos, no watermark.
```

**Presente / Dia das Mães, Natal (feed)**
```
A gift box wrapped in lilac paper (#EADCF4) with a magenta satin ribbon
(#D6246E), one perfume bottle from the reference image exactly preserved
leaning against it, on a marble table, warm golden bokeh lights in the
background, soft directional light from the left, left half of the frame
empty and softly blurred for typography, festive luxury retail photography,
no text, no letters, no logos, no watermark.
```

**Produto recortado (para colocar sobre fundo do Moda)**
Gere com fundo neutro e depois `remove_background`:
```
One perfume bottle from the reference image, exactly preserved, centered on
a plain light gray studio background, even soft light, no shadow on the
background, front view, full bottle visible with margin around it, product
packshot, no text, no letters, no logos, no watermark.
```

## Layouts em markup

Todos assumem `<content font-family="Bricolage Grotesque">` e cores Kindo.
O retângulo `name="foto"` é o alvo do `canvas_edit_image`.

### Story 1080×1920 — foto inteira, texto no terço de baixo

```xml
<content font-family="Bricolage Grotesque">
  <background fill="#3A1238" />
  <rectangle name="foto" x="0" y="0" width="1080" height="1920" fill="#5A2A58" corner-radius="0" />
  <rectangle x="0" y="1180" width="1080" height="740"
             fill="linear-gradient(180deg, rgba(58,18,56,0), rgba(58,18,56,0.95))" corner-radius="0" />
  <rectangle x="72" y="1260" width="380" height="64" fill="#D6246E" corner-radius="32"
             text="Só segunda, DD/MM" font-size="28" font-weight="800" color="#FFFFFF"
             text-align="center" text-vertical-align="middle" />
  <text x="72" y="1350" width="936" height="260" font-size="96" font-weight="800"
        color="#FFFFFF" line-height="1.0" format="html"><p>Preço de</p><p>custo</p></text>
  <text x="72" y="1630" width="936" height="60" font-size="40" font-weight="600"
        color="#EADCF4">Nome do produto 100 ml</text>
  <rectangle x="72" y="1710" width="460" height="96" fill="#FFE45C" corner-radius="16"
             text="R$ 00,00" font-size="56" font-weight="800" color="#3A1238"
             text-align="center" text-vertical-align="middle" />
  <text x="72" y="1840" width="936" height="40" font-size="26" font-weight="600"
        color="#EADCF4">@kindoperfumaria</text>
</content>
```

### Feed 1080×1350 — foto em janela sobre fundo lilás

```xml
<content font-family="Bricolage Grotesque">
  <background fill="#EADCF4" />
  <rectangle name="foto" x="60" y="60" width="960" height="820" fill="#C9B3D6" corner-radius="48" />
  <text x="60" y="920" width="960" height="180" font-size="80" font-weight="800"
        color="#3A1238" line-height="1.02" format="html"><p>Título da</p><p>campanha</p></text>
  <text x="60" y="1110" width="600" height="50" font-size="32" font-weight="600"
        color="#7A5A78">Subtítulo ou produto</text>
  <rectangle x="700" y="1090" width="320" height="90" fill="#D6246E" corner-radius="45"
             text="R$ 00,00" font-size="44" font-weight="800" color="#FFFFFF"
             text-align="center" text-vertical-align="middle" />
  <text x="60" y="1270" width="960" height="40" font-size="26" font-weight="600"
        color="#3A1238">@kindoperfumaria · Válido somente na segunda, DD/MM, ou enquanto durar o estoque.</text>
</content>
```

### Feed 1080×1080 — metade foto, metade texto

```xml
<content font-family="Bricolage Grotesque">
  <background fill="#3A1238" />
  <rectangle name="foto" x="0" y="0" width="1080" height="600" fill="#5A2A58" corner-radius="0" />
  <text x="72" y="650" width="936" height="180" font-size="76" font-weight="800"
        color="#FFFFFF" line-height="1.02" format="html"><p>Título em</p><p>duas linhas</p></text>
  <text x="72" y="850" width="936" height="90" font-size="30" font-weight="600"
        color="#EADCF4" line-height="1.3">Texto de apoio curto, duas linhas no máximo.</text>
  <rectangle x="72" y="960" width="360" height="64" fill="#FFE45C" corner-radius="32"
             text="Só segunda, DD/MM" font-size="28" font-weight="800" color="#3A1238"
             text-align="center" text-vertical-align="middle" />
  <text x="640" y="978" width="368" height="40" font-size="26" font-weight="600"
        color="#EADCF4" text-align="right">@kindoperfumaria</text>
</content>
```

### Cartaz A4 794×1123 — produto recortado, preço grande

Gere o produto com o prompt de packshot num retângulo `name="foto"` de
560×560 centralizado no topo, aplique `remove_background`, e o preço POR
fica como o maior texto da página (`font-size` 140+), em manteiga sobre plum.
Rodapé: "Válido somente na segunda, DD/MM, ou enquanto durar o estoque.
Poucas unidades de cada item." e o código de barras sob o nome.
