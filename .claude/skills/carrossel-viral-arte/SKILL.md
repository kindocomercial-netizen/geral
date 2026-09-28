---
name: carrossel-viral-arte
description: Transforma o texto de um carrossel (o carrossel.json da /carrossel-viral) nas imagens prontas para postar no Instagram — 1080×1350, uma por slide, com a cor da marca de QUALQUER perfil, texto desenhado em código (nunca por IA), barra de progresso e checagem automática de estouro, tamanho de letra e contraste. É a etapa depois da /carrossel-viral. Use sempre que pedirem "faz a arte do carrossel", "gera as imagens dos slides", "transforma esse carrossel em imagem", "design do carrossel", "deixa pronto pra postar", ou logo depois de aprovar um carrossel da /carrossel-viral — mesmo sem dizer "arte". Não escreve o texto (isso é a /carrossel-viral).
---

# Carrossel viral — arte

Recebe o texto pronto e devolve os PNGs. Serve para qualquer perfil: a identidade visual vem **do perfil que vai postar** (ou de um tema neutro), nunca de uma marca fixa.

**Regra que não se negocia: o texto é desenhado em código.** Modelo de imagem erra o texto em cerca de 1 em 3 gerações (medido); aqui o HTML garante que a palavra impressa é a palavra do JSON. Se um dia entrar foto de IA, ela vem **sem texto** e o texto vai por cima, em código.

Fontes de terceiros (MIT, íntegras) em `references/fontes/` — ver `ORIGEM.md`, que também explica por que as duas melhores candidatas (sem licença e AGPL) viraram só ideia, não código.

## Passo 1 — Entrada

O `carrossel.json` fica em `~/carrosseis/<perfil>/<data>-<assunto>/`. Se a pessoa não disser qual, liste os mais recentes (`ls -t ~/carrosseis/*/*/carrossel.json | head`) e deixe escolher. Confira que a `/carrossel-viral` aprovou (`python3 ~/.claude/skills/carrossel-viral/scripts/conferir.py <carrossel.json>`) antes de desenhar — arte de texto errado é retrabalho.

Os slides usam a capa `recomendada`. Se a pessoa escolheu outra, troque o slide 1 no JSON antes.

## Antes do primeiro uso — o desenhador

O `render.py` usa o Playwright (um navegador que tira a foto de cada slide) e o Pillow. Confira uma vez:
```bash
python3 -c "import playwright, PIL" 2>/dev/null && echo ok || (pip install playwright pillow && python3 -m playwright install chromium)
```
Se o `pip` reclamar de ambiente gerenciado, repita com `--break-system-packages`. Se a exportação travar depois disso, rode de novo — é ambiente, não carrossel: nunca refaça o texto por causa do export.

## Passo 2 — Cor da marca

**Ritmo:** o render alterna sozinho o fundo dos slides do meio entre claro e escuro, pela posição; capa, prova e CTA seguem o papel. A conferência final mede a cor de cada imagem e **reprova** 3 ou mais slides seguidos com o fundo quase igual.


Uma cor só; o script deriva o resto (fundo claro, escuro, tinta). Na ordem:
1. a pessoa disse a cor (hex) → use;
2. o perfil tem cor clara na foto/posts → pergunte confirmando ("o rosa dos posts, tipo #D9738A?");
3. sem cor → tema pronto: `neutro` (azul), `quente`, `verde`, `rosa`, `mono`.

Nunca use a identidade de outro perfil como padrão. Se o carrossel é do próprio dono e existe `~/carrosseis/<perfil>/perfil.md` com a cor, use a de lá; senão pergunte.

Cor tirada da foto de perfil: medir a cor dominante (quantização) funciona, mas confirme com a pessoa quando der. **Marca pastel** (cor bem clara) é tratada sozinha: ela vira o fundo dos slides claros e a prova ganha um tom mais forte da mesma cor — sem isso, a marca sumia em 8 de 9 slides (medido no teste).

Fontes: padrão Fraunces (título) + Inter (corpo), do Google Fonts. Pode trocar por outro par do Google Fonts se a marca pedir (ex.: `"Playfair Display" "DM Sans"`).

**Cursiva (opcional):** se o perfil usa letra manuscrita (assinatura, "zinn blends"), passe um 5º argumento com uma fonte cursiva do Google Fonts (ex.: `Caveat`). Ela entra só no título da capa e do CTA, maior; o resto continua na fonte do título. Sem o argumento, nada muda.

**Capa e CTA claros (opcional):** perfil de feed claro e aconchegante (café, confeitaria, moda leve) → 6º argumento `claro`: capa e CTA saem num tom claro da marca em vez de escuro. Sem cursiva, use `-` no 5º lugar (ex.: `... Fraunces Inter - claro`).

## Passo 2.5 — Fotos (opcional, Nano Banana)

Carrossel só de texto fica sóbrio demais para perfil de produto (comida, moda, loja). Se a pessoa quiser foto — ou se o feed do perfil é todo de foto — gere com a skill `/nanobanana`.

1. **Referência:** olhe os posts do perfil (Instagram só via Apify `apify/instagram-scraper`, ~12 posts). Monte uma grade e anote cenário, luz, paleta e props. Use isso no prompt; não invente estética.
2. **Quais slides:** 3 ou 4, intercalados com slides só de texto (medido no teste: capa, um do meio com dado, um do meio com produto e o CTA). Prova (fundo na cor da marca) fica sem foto.
3. **Gerar** — um por slide, em paralelo, quadrado:
```bash
python3 ~/.claude/skills/nanobanana/scripts/gerar_imagem.py --formato feed_quadrado --resolucao 2K \
  --output <pasta-do-json>/fotos/01.png --prompt "<cena do slide>. <estética do perfil>. Absolutely no text, no letters, no logos, no watermark."
```
   O nome do arquivo é o número do slide (`01.png` vai no slide 1). O `render.py` acha a pasta `fotos/` sozinho e põe a foto no topo do slide, com o texto embaixo.
4. **Conferir antes de desenhar:** abra as fotos. Qualquer letra ou logo na imagem → gere de novo. **Texto nunca vem do modelo.**
5. **Avisar a pessoa:** foto de IA mostra produto genérico, não o dela. Se o cardápio/produto real for diferente, a foto promete o que não existe.

## Passo 3 — Gerar

```bash
python3 ~/.claude/skills/carrossel-viral-arte/scripts/render.py <carrossel.json> <#cor | tema> [fonte-título] [fonte-corpo] [fonte-cursiva|-] [claro]
```

Sai em `design/` ao lado do JSON: `slide-01.png` …, o `carrossel.html` editável e `previa-feed-360px.png` (todos os slides no tamanho do celular). Se já existir um `design/`, ele é guardado como `design-<data-hora>/` — nada é apagado. O script já confere três coisas e responde APROVADO ou REPROVADO:
- **texto estourando** a área do slide (medido no navegador);
- **letra menor que 28px** (mínimo legível no celular);
- **contraste abaixo de 4,5:1** entre texto e fundo (a tinta é escolhida automaticamente; se nem assim passar, escureça a cor).

Reprovou por estouro → **corte o texto antes de diminuir a letra** (a ideia vem da guizang): volte à `/carrossel-viral`, encurte aquele slide, rode o conferir dela e gere de novo. Não mexa no tamanho da fonte para caber.

Fundo por papel: capa e CTA escuros, contexto e corpo claros, prova na cor da marca — o contraste entre slides ajuda o olho a sentir que avançou.

## Passo 4 — Olhar de verdade

APROVADO mede estouro, tamanho e contraste — **não mede se ficou bonito**. Antes de entregar, abra (Read) **pelo menos a capa, um slide do meio e o CTA em tamanho cheio** (protocolo da `charlie947-graphic-designer.md`): texto exato, nada cortado, emoji renderizado, nada colado na borda. Depois abra a `previa-feed-360px.png` para ver a sequência como no feed: a marca aparece? os slides se distinguem? A prévia não substitui o tamanho cheio — miniatura esconde texto cortado.

Sem ter olhado, diga "gerado, não inspecionado" — nunca "pronto".

## Passo 5 — Entregar

Mande a capa e 2 slides para a pessoa ver (SendUserFile), diga a pasta dos 9 e o que o APROVADO cobre e não cobre. Termine com uma pergunta: aprova ou quer outra cor/fonte.

## O que ainda não faz (limites conhecidos)
- Um desenho só por slide (título + texto). Não tem layout de número grande, lista com marcador ou erro × acerto lado a lado.
- Não mede faixa vazia: slide com pouco texto fica com bastante respiro (no teste, a pessoa aprovou assim).
- Foto só no topo do slide (um layout); não usa logo.
- Precisa de internet para carregar as fontes.
