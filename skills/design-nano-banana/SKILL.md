---
name: design-nano-banana
description: Cria e edita designs da Kindo Perfumaria (@kindoperfumaria) no Moda usando imagens geradas pelo Nano Banana (Gemini) — post de feed, story, carrossel, cartaz A4, banner — com fundo ou foto gerada dentro da própria peça e textos, preços e logo editáveis por cima. Use sempre que Julio pedir um design, arte, post, story, cartaz, banner ou "imagem para o Instagram", pedir para "gerar uma imagem", "usar o nano banana", "colocar uma foto de perfume no fundo", trocar ou melhorar a imagem de um design que já existe, ou anexar uma foto de produto pedindo uma arte com ela — mesmo sem citar Moda ou Nano Banana pelo nome.
---

# Design com Nano Banana (no Moda)

O Nano Banana é o modelo de imagem do Google que está integrado ao Moda.
Ele não gera imagem solta: gera **dentro de um elemento de um design já
criado** (`canvas_edit_image`). O fluxo é sempre: montar a peça no Moda com
um retângulo reservado para a imagem → gerar a imagem nesse retângulo →
conferir → entregar o link do editor e o PNG.

Por que assim: texto, preço, logo e etiqueta ficam como camadas editáveis;
só a imagem é gerada. Julio consegue trocar o preço ou a data no editor sem
gerar de novo (e sem gastar crédito).

## Antes de começar

1. `moda_bootstrap` uma vez por sessão. Confira `plan` e `media.metered`:
   geração de imagem consome créditos; tudo o mais (canvas, texto, export,
   screenshot) é grátis.
2. `brand_list`. Se existir um kit da Kindo, use `brand_kit_id` no
   `canvas_create`. Se não existir e Julio não pediu para criar, use
   `skip_brand_kit=true` e pinte a identidade abaixo à mão. Ofereça criar o
   kit uma vez (`brand_create`), sem insistir.
3. Combine o **número de gerações** antes de gastar. Regra prática: 1 imagem
   por peça, e mais uma só se a primeira falhar na conferência. Se Julio
   pediu "algumas opções", pergunte quantas ou assuma 2 e diga isso.
4. Se o pedido for editar um design que já existe: `canvas_read` primeiro
   (é o que cria os ids `n…`/`p_…` usados por todas as outras ferramentas).

## Identidade Kindo (quando não houver brand kit)

- Cores: plum `#3A1238`, magenta `#D6246E`, lilás `#EADCF4`, manteiga `#FFE45C`.
- Fonte: Bricolage Grotesque (Google Fonts). Títulos peso 800, corpo 600.
- Assinatura `@kindoperfumaria` no rodapé.
- Preço em `R$ 00,00`; em cartaz, o preço POR é o maior elemento da página.
- Campanha "Segunda do Preço de Custo": etiqueta de preço com furo, magenta
  no título e manteiga nos preços. Detalhes na skill `segunda-preco-de-custo`.

Use essas cores no prompt da imagem também (luz lilás, fundo plum, detalhe
dourado/manteiga) para a foto gerada conversar com a tipografia.

## Tamanhos

| Peça | `category` | width×height | aspect_ratio da imagem |
|---|---|---|---|
| Post feed quadrado | social | 1080×1080 | 1:1 |
| Post feed retrato / carrossel | carousel | 1080×1350 | 4:5 |
| Story / Reels capa | social | 1080×1920 | 9:16 |
| Cartaz A4 (tela) | prints | 794×1123 | 3:4 (gere e ajuste) ou 2:3 |
| Banner site / capa | other | 1920×1080 | 16:9 |

Passe `width`/`height` explícitos no `canvas_create`; não confie no padrão
da categoria. Um `aspect_ratio` fora da lista do modelo faz a chamada falhar
(não arredonda): use só `auto, 1:1, 21:9, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 5:4, 4:5`.

## Passo a passo

### 1. Criar o canvas

```
canvas_create(category="social", width=1080, height=1350,
              name="Kindo — <tema> — <data>", intent="<uma frase>",
              brand_kit_id=<bk_…> | skip_brand_kit=true)
```

Mande o `editor_url` para Julio assim que existir — ele pode acompanhar.

### 2. Montar o layout com um retângulo reservado para a imagem

O alvo do Nano Banana é um `<rectangle>` comum. Dê a ele um `name` (ex.
`name="foto"`): o resultado do `canvas_apply_markup` traz `detail.nodeMap`
com `foto → id` e o `state_fragment` com o id curto (`n1`); qualquer um dos
dois serve em `node`. Coloque-o **primeiro**
no markup (camada de baixo) e todo texto depois (camadas de cima). Quando há
texto sobre a foto, ponha um retângulo escuro semitransparente (scrim) entre
os dois para garantir leitura.

```xml
<content font-family="Bricolage Grotesque">
  <background fill="#3A1238" />
  <!-- alvo da imagem: página inteira -->
  <rectangle name="foto" x="0" y="0" width="1080" height="1350" fill="#5A2A58" corner-radius="0" />
  <!-- scrim para o bloco de texto -->
  <rectangle x="0" y="900" width="1080" height="450"
             fill="linear-gradient(180deg, rgba(58,18,56,0), rgba(58,18,56,0.92))" corner-radius="0" />
  <text x="72" y="960" width="936" height="200" font-size="84" font-weight="800"
        color="#FFFFFF" line-height="1.02" format="html"><p>Segunda do</p><p>Preço de Custo</p></text>
  <rectangle x="72" y="1180" width="420" height="72" fill="#FFE45C" corner-radius="36"
             text="Só segunda, 29/09" font-size="32" font-weight="800" color="#3A1238"
             text-align="center" text-vertical-align="middle" />
  <text x="72" y="1280" width="936" height="40" font-size="28" font-weight="600"
        color="#EADCF4">@kindoperfumaria</text>
</content>
```

Variações: imagem em meia página (retângulo 1080×700 no topo, texto em fundo
plum embaixo), imagem em "janela" com `corner-radius="48"` sobre fundo lilás,
ou produto recortado (gerar com fundo neutro e depois `remove_background`).
Receitas prontas em `references/receitas.md`.

### 3. Gerar a imagem com o Nano Banana

```
canvas_edit_image(canvas_ref=<cvs_…>, node=<id do retângulo "foto">,
  operation={ "kind": "generate", "model": "nano-banana",
              "prompt": "<prompt completo>", "aspect_ratio": "4:5",
              "resolution": "1K" })
```

Escolha do modelo:

| Modelo | Quando | Resoluções |
|---|---|---|
| `nano-banana-lite` | rascunho, teste de conceito, fundo abstrato, várias opções | 1K |
| `nano-banana` | **padrão** para post, story, cartaz | 512px, 1K, 2K, 4K |
| `nano-banana-pro` | peça de destaque, impressão grande, cena complexa com vários produtos | 1K, 2K, 4K |

1K basta para Instagram. Use 2K só para impressão ou banner grande; custa mais.
`model_params.thinking_level="HIGH"` (lite e padrão) ajuda em cenas com
composição difícil; não use por padrão.

**Foto do produto real**: quando Julio mandar a foto do produto (ou ela
estiver em `assets/fotos/<EAN>.png` da skill `segunda-preco-de-custo`), suba
com `upload` e passe o `file_…` em `reference_images`. No prompt, diga
explicitamente para preservar o frasco, rótulo e cores da referência e mudar
só o cenário. Sem isso o modelo inventa um produto genérico — e um rótulo
inventado numa arte de loja é problema.

O prompt vai **literalmente** ao modelo; nada é acrescentado. Escreva em
inglês (rende melhor), com: assunto → material/textura → luz → câmera e
enquadramento → paleta → **onde deixar espaço vazio para o texto** → "no
text, no letters, no logos, no watermark". Texto, preço e logo são camadas
do Moda, nunca da imagem: o modelo erra ortografia e o preço não pode estar
"queimado" na foto. Exemplos e fórmulas em `references/receitas.md`.

A chamada espera a imagem ser colocada. Se voltar `working`, **repita a
mesma chamada idêntica** (reanexa ao mesmo job, sem nova cobrança) ou use
`task_status`. Para pedir outra variação, passe `repeat_token` novo — isso
cobra de novo, então só faça se combinado.

### 4. Conferir

`canvas_screenshot` (ou `screenshot=true` na última escrita) e **olhe** a
imagem antes de descrever:

- O produto parece o da referência? Rótulo legível e correto? Nenhum texto
  inventado na imagem?
- O bloco de texto está legível sobre a foto? Se não, escureça o scrim
  (`canvas_edit`), não gere de novo.
- Mãos, reflexos e frascos duplicados são os erros mais comuns do modelo.
  Se houver, refine o prompt (diga o que evitar) e gere uma vez mais com
  `repeat_token`; se persistir, troque para `nano-banana-pro`.
- Cheque contra a lista de clichês de IA: gradiente roxo genérico, vidro
  fosco flutuando, tudo centralizado. Uma imagem de perfumaria boa tem
  direção de luz clara, uma superfície real (mármore, linho, madeira) e
  profundidade.

### 5. Entregar

- Link do editor (`editor_url`) — é a entrega principal; Julio edita lá.
- `export(format="png")` para o arquivo pronto de postar. Para carrossel,
  um export por página. Para cartaz, `format="pdf"`.
- Diga quantas gerações foram usadas e com qual modelo.

## Editar um design que já tem imagem

Depois do `canvas_read`, ache o nó de imagem e use `canvas_edit_image` com:

- `kind="edit"` + prompt dizendo **o que preservar** e o que mudar
  ("keep the bottle exactly as is; change the background to …").
- `kind="remove_background"` para recortar o produto (comece sem
  `high_quality`; a versão generativa pode apagar um segundo objeto).
- `kind="upscale"`, `scale=2|4`, para impressão.
- `kind="outpaint"` para estender a cena (sem prompt; `aspect_ratio` **ou**
  `expand_*`, nunca os dois; limite 2048px por lado).

## Erros e limites

- `insufficient_credits` ou recusa de cobrança: a equipe está sem crédito.
  Avise com a mensagem literal e pare; não tente de novo nem entregue a
  peça sem imagem em silêncio (ofereça o design com fundo em shader como
  alternativa grátis, se Julio quiser).
- Imagem gerada mas não colocada: `kind="retry_placement"` com o
  `task_ref` no mesmo canvas — recupera sem nova cobrança.
- Mesmo erro duas vezes: `ask_expert(question, context=<erro>)`, é grátis.
- `quote=true` valida a chamada sem gerar nem cobrar e devolve
  `credits_remaining`. Use antes da primeira geração da sessão para
  confirmar ratio/resolução e saber quanto crédito resta.
- Não existe imagem solta: se Julio quiser só a foto, gere na peça e
  exporte o PNG do canvas com o retângulo ocupando a página toda.
