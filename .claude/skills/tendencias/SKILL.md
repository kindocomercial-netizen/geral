---
name: tendencias
description: Pesquisa tendências e assuntos em alta em QUALQUER nicho e prova cada uma cruzando fontes — Google Trends (procura), YouTube (atenção e comentários), TikTok/Instagram (criadores postando), Reddit (conversa), imprensa (fato) e Amazon (vendas) — via Firecrawl. Devolve um mapa de cruzamento com diagnóstico (lacuna, consolidada, saturada, fim de onda, chegando, armadilha), nota de confiança, checagem de fake news, alerta de tema sensível e ideias de post por rede. Use sempre que a pessoa pedir "tendências de X", "o que está bombando no meu nicho", "assuntos em alta sobre Y", "sobre o que eu posto essa semana", "ideias de conteúdo baseadas no que está rolando", ou invocar /tendencias — mesmo sem dizer o nicho (aí a skill pergunta). Também tem modo sem nicho: "o que está em alta no Brasil", "me dá um assunto em alta pra postar", "tema pra demo" — garimpa o que está bombando no país, filtra o que rende conteúdo e propõe opções. O nicho nunca é fixo: sempre vem da pessoa.
---

# Tendências

Descobre o que está em alta num nicho **agora**, prova com dados cruzados e transforma em pauta. Serve para qualquer pessoa e qualquer nicho.

**A ideia central:** um assunto só é tendência quando aparece em vários lugares — e cada lugar mede uma coisa diferente:

| Fonte | Mede | Ferramenta |
|---|---|---|
| Google Trends | **Procura** — gente querendo saber (única com % de crescimento) | navegador da pessoa (`references/google-trends-navegador.md`) ou `scripts/google_trends.py` |
| Autocompletar do Google | **Dúvida exata** que as pessoas digitam | `scripts/google_sugestoes.sh` |
| YouTube | **Atenção** — views, idade e **estouro para o tamanho do canal** | `scripts/youtube_numeros.sh` + `scripts/youtube_estouro.sh` |
| Comentários do YouTube | **Sentimento** — medo, desconfiança, objeção real | `scripts/comentarios_youtube.sh` |
| TikTok / Instagram | **Oferta** — quantos criadores estão postando | Firecrawl `site:` |
| Reddit / fóruns | **Conversa** — debate, pergunta | Firecrawl `site:` |
| Imprensa | **Fato** — o que aconteceu, com data | Firecrawl `--sources news` |
| Amazon mais vendidos | **Dinheiro** — gente comprando | Firecrawl scrape |

Uma fonte sozinha engana — o teste real mostrou isso: "Eskiva suplementos" subiu +3.900% no Google e parecia marca nova bombando; cruzando com YouTube e TikTok, eram vídeos de "invista R$ 1.000 na plataforma" e buscas de "é confiável?". Sem cruzamento, a skill teria recomendado postar sobre um possível esquema.

Catálogo completo de fontes, o que abre e o que não abre, e quais usar por nicho: `references/fontes.md`. Leia antes do Passo 2.

## Passo 0 — Modo sem nicho (quando a pessoa não tem tema)

Use quando a pessoa pedir "o que está em alta", "qualquer assunto", "um tema pra demo/exemplo", ou responder "sem nicho" / "tanto faz" à pergunta do Passo 1. O objetivo é **propor 3–5 assuntos em alta no país que rendem bom conteúdo** e deixar a pessoa escolher um para aprofundar.

1. **Garimpar o que está em alta no país:**
   ```bash
   bash $S/em_alta_geral.sh BR     # "em alta hoje" do Google: tráfego | assunto | notícia ligada
   ```
   Complete com a página "Em alta" do Google Trends dos últimos 7 dias pelo navegador, se houver extensão (`https://trends.google.com/trending?geo=BR&hours=168&hl=pt-BR` — mesma receita da aba visível de `references/google-trends-navegador.md`), e com 1–2 buscas de notícias da semana (`firecrawl search "<assunto>" --sources news --tbs qdr:w --country BR`).
2. **Filtrar** — tire o que divide ou machuca a audiência, porque um assunto de exemplo precisa servir para qualquer pessoa:
   - jogo/placar/resultado esportivo ao vivo;
   - política, eleição, candidato;
   - morte, crime, tragédia como assunto principal;
   - fofoca sobre pessoa específica, ou pessoa específica em caso policial/judicial.
   Mantenha o que for **utilidade, curiosidade ou mudança que afeta o dia a dia** (conta de luz, alerta no celular, clima, lançamento, golpe novo, prazo de governo, fenômeno da natureza, cultura pop sem polêmica).
   A palavra da lista nem sempre é o assunto: "tarifa" pode ser a bandeira verde da conta de luz; "homem-aranha" pode ser um filme novo de outra franquia. **Nomeie o candidato pela notícia ligada**, não pela palavra, e escolha um termo de checagem sem duplo sentido ("bandeira tarifária", não "bandeira verde").
   Se sobrarem menos de 3, garimpe mais: página "Em alta" de 7 dias no navegador ou notícias da semana.
3. **Checar rápido cada sobrevivente (máx. 6):**
   - Google Trends do termo (1 consulta cada): **subindo agora** ou já no fim de onda? — pela receita do navegador ou pelo script;
   - `google_sugestoes.sh "<termo>"`: as pessoas perguntam "como", "o que é", "por que"? Isso é sinal de que rende explicação;
   - encaixe em conteúdo: dá para explicar em 6–10 slides ou 30–60 segundos, com fato concreto?
4. **Propor 3–5 opções** (AskUserQuestion, recomendada primeiro), cada uma com uma linha: o que é, a curva (subindo / fim de onda) e por que rende conteúdo. Diga também o que foi descartado e por quê (ex.: "futebol e eleição ficaram de fora").
5. Com a escolha, siga o fluxo normal a partir do Passo 1, usando o assunto escolhido como tema (público padrão: Brasil).

Se a busca de notícias da semana não confirmar o fato que puxou o pico, tente sem filtro de tempo (conferindo a data de cada resultado) ou o site oficial do órgão envolvido; sem confirmação, proponha a opção marcada como *fato não confirmado*.

Cuidado já medido: o que aparece no garimpo pode ser **eco de fato antigo** (no teste, um TikTok relembrava um alerta de junho como se fosse novo). Confira a data na notícia antes de propor.

## Passo 1 — Perguntar

Se a pessoa ainda não disse, pergunte numa única mensagem (AskUserQuestion se disponível, com a opção recomendada primeiro):

1. **Nicho ou tema** (obrigatório). Se a pessoa não tiver, ofereça o modo sem nicho (Passo 0).
2. **Redes onde publica** (padrão: Instagram, TikTok e YouTube) — define para quais redes saem as ideias, não onde se pesquisa.
3. **Onde está o público** (padrão: Brasil inteiro). Quem atende local — clínica, loja, restaurante, prestador — deve informar o **estado** (e a cidade, se quiser): o Google Trends filtra por estado (`BR-RJ`, `BR-SP`...) e mostra até as cidades dentro dele. Ofereça isso explicitamente se o nicho parecer negócio local.
4. **Janela** (padrão: última semana; alternativa: último mês).

Traduza o que a pessoa já disse: "esse mês" = mês; "hoje"/"agora" = semana; "pra postar no TikTok" = só TikTok. Não siga sem o nicho; o resto tem padrão.

Profundidade padrão: checar a fundo os **5** candidatos mais promissores. Se a pessoa pedir "a fundo"/"completo", cheque 8.

## Passo 2 — Garimpar candidatos

**Antes de buscar, quebre o nicho em 3–5 termos específicos** — os nomes que o público digita (procedimentos, produtos, problemas). Termo amplo engana: no teste, "estética" no Rio trouxe principalmente *estética automotiva*, faculdade e maca; os achados reais vieram de "harmonização facial", "botox" e "bioestimulador". Rode o Google Trends nesses termos, não no nome genérico do nicho. Se não souber os termos, use o autocompletar (`google_sugestoes.sh "<nicho>"`) e o TOP do Trends do termo amplo para descobri-los.

Se a pessoa deu um estado, use-o em **toda** consulta do Trends (`geo=BR-RJ`) e leia as **cidades** no lugar dos estados. Com filtro de estado, termo muito específico costuma dar "não há dados suficientes": prefira termos médios ("botox", "harmonização facial") e garimpe os específicos nas **buscas relacionadas** deles — foi de onde saíram os melhores achados no teste do Rio.

Para achar vídeos do YouTube da semana, combine `youtube_numeros.sh` com `firecrawl search "site:youtube.com <termo>" --tbs qdr:w --country BR` — no teste, a segunda achou vídeos que a primeira perdeu.

Objetivo: juntar 10–15 assuntos candidatos, rápido e largo. Rode em paralelo:

```bash
mkdir -p .firecrawl
S=<pasta-da-skill>/scripts
# Procura: o que está subindo no Google (termo amplo do nicho + 1-2 subtemas)
python3 $S/google_trends.py "<nicho>" BR "today 1-m"
# Imprensa local e de fora
firecrawl search "<nicho>" --sources news --tbs qdr:w --country BR --limit 10 --json -o .firecrawl/n1.json
firecrawl search "<nicho em inglês>" --sources news --tbs qdr:w --country US --limit 10 --json -o .firecrawl/n2.json
# Atenção: vídeos da semana com views
bash $S/youtube_numeros.sh "<nicho>" semana BR pt-BR
# Oferta e conversa
firecrawl search "site:tiktok.com <nicho>" --tbs qdr:w --country BR --limit 8 --json -o .firecrawl/tt.json
firecrawl search "site:instagram.com <nicho>" --tbs qdr:w --country BR --limit 8 --json -o .firecrawl/ig.json
firecrawl search "site:reddit.com <nicho em inglês>" --tbs qdr:w --country US --limit 8 --json -o .firecrawl/rd.json
# + fontes extras do perfil do nicho (references/fontes.md)
```

**"Não achou" ≠ "não conseguiu olhar"** (ideia da skill last30days), em **toda** fonte:
- busca que rodou e voltou vazia = **0 resultados** → no mapa vira **○** (ausente) — isso é informação;
- fonte que falhou (erro, bloqueio, limite, página que não abre, ferramenta ausente, tempo esgotado) = **não medido** → no mapa vira **?** — isso NÃO é ausência.
Nunca escreva "ninguém está falando disso" sobre uma fonte que não foi medida; diga "cobertura parcial: <fonte> não medida". Uma célula **?** não conta nem a favor nem contra na nota.

Leia os resultados com `[ -f <arquivo> ] && jq -r '(.data.news // [])[], (.data.web // [])[] | "\(.date // "") | \(.title) | \(.url) | \((.snippet // .description // "")[0:160])"' <arquivo> || echo "0 resultados"`.

Cuidados que já custaram diagnóstico errado:
- O CLI do Firecrawl **não cria o arquivo quando não há resultado**. Confira com `ls .firecrawl/` e olhe a saída do comando: "No results found" = **0 resultados (○)**; erro, tempo esgotado ou nada impresso = **não medido (?)**.
- Use `--country` do público em toda busca local, inclusive `site:` (sem ele, resultados vêm em outra língua).
- `site:` + filtro de tempo não é garantido: confira a data de cada resultado.
- Escreva cada comando por extenso (flags em variável quebram no zsh).

A seção **EM ALTA** do Google Trends é a melhor fonte de candidatos: são buscas com crescimento medido. Dê prioridade a elas. Junte grafias do mesmo assunto ("eskiva", "skiva", "esquiva") num candidato só, e use a grafia mais curta como termo de checagem — termo longo demais tem pouco volume e o Trends devolve vazio.

Pesquisa acadêmica e fontes científicas: busque **em inglês** (em português a categoria research devolve lixo).

Escolha os 5 candidatos (ou 8) com mais sinal inicial. **Cuidado com termo de duplo sentido:** "botox" é procedimento de rosto e também tratamento de cabelo ("botox capilar", Probelle); "harmonização" pode ser facial ou orofacial. Antes de checar, olhe as buscas relacionadas e os resultados do TikTok: se misturam sentidos, use o termo com qualificador ("botox facial", "toxina botulínica") e descarte o que for do outro sentido.

Anote o **termo de checagem** de cada um — a palavra que as pessoas realmente usam (ex.: "creatina câncer", não "creatina e neoplasia"). É esse termo que vai ser rodado em todas as fontes; nome diferente em cada fonte desfaz o cruzamento.

## Passo 3 — Checagem cruzada (o coração da skill)

Para **cada candidato**, rode o **mesmo termo** em cada fonte e anote o que achou:

```bash
python3 $S/google_trends.py "<termo>" BR "today 1-m"      # curva, regiões, buscas relacionadas
bash $S/google_sugestoes.sh "<termo>"                      # dúvidas; teste também "<termo> é", "<termo> causa", "<termo> golpe", "<termo> vale a pena"
bash $S/youtube_numeros.sh "<termo>" semana BR pt-BR       # atenção
firecrawl search "site:tiktok.com <termo>" --tbs qdr:w --country BR --limit 8 --json -o .firecrawl/c-tt.json
firecrawl search "<termo>" --sources news --tbs qdr:w --country BR --limit 8 --json -o .firecrawl/c-n.json
firecrawl search "site:reddit.com <termo em inglês>" --tbs qdr:w --limit 5 --json -o .firecrawl/c-rd.json
```

Para os 2–3 candidatos mais fortes, puxe também os **comentários** do vídeo de maior audiência (ver Passo 4).

Se o nicho vende produto, confira a lista de mais vendidos da Amazon (Passo 5).

### Google Trends: navegador primeiro, script depois

Ordem de uso:
1. **Navegador da pessoa**, se houver extensão controlável (ex.: Claude in Chrome) — siga `references/google-trends-navegador.md`. Medido: 9 consultas seguidas, 9 completas, enquanto o script estava bloqueado. Atenção à armadilha da aba em segundo plano descrita lá (parece bloqueio, não é).
2. **Script** `scripts/google_trends.py`, sem navegador disponível — respeitando o orçamento abaixo.
3. Uso intenso e frequente: API paga — `references/google-trends-opcoes.md` (ex.: SerpApi, a partir de US$ 25/mês por 1.000 consultas).

### Orçamento do script

O Google bloqueia depois de muitas consultas seguidas (medido: ~25 consultas em ~40 minutos travaram tudo, com redirecionamento para a página de "não sou um robô"; o bloqueio dura de minutos a horas). Pelo script, use **no máximo ~8 consultas** por pesquisa: 1–2 no garimpo e 1 por candidato checado. Espere uns 10 segundos entre elas. Depois de um bloqueio, espere pelo menos 1 hora antes de tentar de novo. O autocompletar (`google_sugestoes.sh`) é outro serviço e não entra nessa conta.

Se o script disser "FALHOU: ... limite de pedidos", não insista: siga com as outras fontes, marque Procura como "não medida" no mapa (não como ○) e diga no relatório.

### Como ler cada fonte

**Google Trends — curva (0–100):** nota de interesse relativa ao pico do período.
- Subindo nos últimos dias → procura crescendo.
- Pico no meio e caindo agora → **a onda já passou**. Diga a data do pico.
- Zeros alternados com picos, ou valores em degraus redondos (100, 83, 66, 50, 33, 16) → **pouco volume**: o Google trabalha com amostra e com pouca busca o gráfico oscila. Não tire conclusão forte.
- "Aumento repentino" em EM ALTA = crescimento acima de 5.000%.

**Google Trends — regiões:** mostra **proporção** (quanto o assunto pesa entre as buscas daquele estado), **não volume** — São Paulo quase sempre tem mais gente buscando em número absoluto. Compare a região no termo específico com a região no tema geral do nicho:
- destaque só no termo específico → algo local acontecendo; investigue (notícia, influenciador, caso da região);
- destaque nos dois → é só onde o público do nicho já está (útil para negócio local).
- com filtro de estado, a lista vira **cidades**: para negócio local, diga em quais cidades o assunto pesa mais — é pista de onde anunciar (proporção, não tamanho de público).

**YouTube:** views altas sozinhas enganam — canal grande sempre tem mais views. Meça o **estouro para o tamanho do canal** (ideia do workflow de tendências da Apify) nos 2–3 vídeos de maior audiência de cada candidato:
```bash
bash $S/youtube_estouro.sh "<url1>" "<url2>"
# 0.2x (normal para o canal) | 349171 views | 2160000 inscritos | ...
```
Razão views ÷ inscritos: **> 10 = estouro** (sinal forte de assunto que puxa público além da base do canal); 1–10 = acima do normal; < 1 = normal. Medido no teste: o vídeo de 347 mil views da polêmica da creatina era de um canal de 2,16 milhões de inscritos — razão 0,2, vídeo *normal* para o canal, não prova de estouro. Use a razão como critério principal e o contraste com os vizinhos da busca (10× a mediana) só como apoio. O YouTube traduz títulos para o inglês; título em inglês não prova que o vídeo é gringo — confira o canal (`firecrawl scrape <url>` e procure "Uploaded by"). Marque a origem *(BR)* ou *(fora)*. "`? (ambíguo)`" = número pequeno.

**TikTok / Instagram / Reddit:** o Firecrawl acha mas não abre. Conte quantos posts **da janela** apareceram (oferta de conteúdo) e use curtidas quando o trecho da busca trouxer, marcadas *(do resumo da busca)*.

**Imprensa:** conte veículos independentes (mesmo portal ou mesmo grupo repetindo release = 1).

### Montar o mapa de cruzamento

Para cada candidato, marque cada fonte como **●** forte, **◐** fraco, **○** ausente (medido e vazio) ou **?** não medido (falhou):

| Fonte | ● forte | ◐ fraco |
|---|---|---|
| Procura (Trends) | curva subindo ou em EM ALTA com +100% ou mais | aparece, mas estável ou pouco volume |
| Atenção (YouTube) | vídeo BR com razão views ÷ inscritos > 10 | vídeos existem, razão < 10, ou destaque só de fora |
| Oferta (TikTok/IG) | 5+ posts na janela ou curtidas altas no resumo | 1–4 posts |
| Conversa (Reddit/comentários) | debate ativo, comentários com muitas curtidas | poucas menções |
| Fato (imprensa) | 3+ veículos independentes | 1–2 |
| Dinheiro (Amazon) | produto do assunto no top 10 | aparece fora do top |

Nicho de serviço (clínica, consultoria, restaurante) não tem produto na Amazon: marque Dinheiro como **—** (não se aplica) e não conte na nota.

### Diagnóstico

A combinação diz mais que a soma. Dê a cada candidato **um** diagnóstico:

| Combinação | Diagnóstico | Recomendação |
|---|---|---|
| Procura ● e pouca oferta/atenção | 🥇 **Lacuna** — muita gente buscando, pouca gente explicando | Postar já: é onde o conteúdo novo mais cresce |
| Procura ●, atenção ●, conversa ● | ✅ **Consolidada** | Postar, mas com ângulo diferente do que já existe |
| Procura ● e muito conteúdo num formato, pouco em outro (ex.: Instagram cheio, YouTube/Reels vazio) | 🎯 **Lacuna de formato** | Postar no formato que está vazio |
| Assunto que teve fim de onda e voltou a subir por fato novo | 🔂 **Segunda onda** | Aproveitar o fato novo; ângulo diferente do da primeira onda |
| Oferta ● e procura ○/◐ | 🔁 **Saturada** — moda de criador | Evitar ou subverter |
| Fato ● e procura/atenção fracas | 📰 **Pauta de jornal** — o público não está ligando | Só com ângulo prático ("o que isso muda pra você") |
| Curva com pico e caindo | 📉 **Fim de onda** | Conteúdo de "o que ficou esclarecido", não "urgente" |
| Forte lá fora, fraco aqui | 🛬 **Chegando** | Antecipar — vantagem de ser o primeiro |
| Discussão só entre profissionais (conselhos, decisão judicial, regulação) com procura baixa do público | 🩺 **Pauta de bastidor** | Traduzir para o público ("o que isso muda pra você") ou usar para autoridade entre pares |
| Buscas com "é confiável", "golpe", "funciona", "é seguro" em destaque | ⚠️ **Desconfiança / possível armadilha** | Verificar (Passo 4) antes de qualquer post; pode virar conteúdo de alerta |

### Nota de confiança

- **🟢 Forte** — 3+ fontes ● e pelo menos um número do público local (Trends, vídeo BR com estouro > 10 ou curtidas).
- **🟡 Média** — 2 fontes ●, ou 3+ fontes ◐, ou o número forte é só de fora.
- **🔴 Fraca** — 1 fonte ●, ou só fontes não abertas.

A nota é a soma das provas do mapa — nunca suba por intuição.

**Lacuna nasce com nota baixa — e isso é esperado.** Por definição, lacuna é procura forte com pouco conteúdo, então terá 1 fonte ● e nota 🔴. Não confunda: a nota diz que o assunto ainda não está provado em vários lugares; o diagnóstico diz que é oportunidade *justamente por isso*. Numa lacuna, a prova que importa é a força da Procura (aumento repentino ou +100%) — escreva isso na linha "Por que essa nota".

**Decisão final: vai / cuidado / não vai** (ideia da skill trend-spotter). Feche cada tendência com uma das três, numa linha, com o motivo:
- **✅ Vai** — diagnóstico favorável (lacuna, consolidada, chegando) e sem ⚠️ que impeça; diga o prazo ("postar esta semana", "antes de dd/mm").
- **⚠️ Cuidado** — tem oportunidade, mas depende de algo: tema sensível, informação distorcida a corrigir, fim de onda (só com ângulo "o que ficou"), acusação não comprovada.
- **⛔ Não vai** — saturada, armadilha, sem prova suficiente, ou fora do encaixe com o público.

**Nota ≠ recomendação.** A nota diz o quanto a tendência está *provada*; o diagnóstico diz *o que fazer*. Um "📉 Fim de onda · 🟢" significa "está comprovado que foi grande — e já está passando". Diga isso em uma linha no relatório para não confundir. Um assunto pode ter mais de um diagnóstico (ex.: fim de onda + distorcida): liste os dois, o principal primeiro.

## Passo 4 — Verificar: fake news, sentimento e sensibilidade

Faça para os candidatos que vão para o relatório.

**4.1 Não cair em fake news.** Viral e verdadeiro são coisas diferentes — às vezes a tendência mais forte da semana é justamente uma distorção.
1. **Ache a fonte primária.** Não a matéria sobre o estudo: o estudo, o documento oficial, o anúncio da empresa. Abra com `firecrawl scrape` e confira o que ela realmente diz (em quem foi testado, quantas pessoas, que conclusão).
2. **Confira a data original.** Estudo antigo republicado como novo é comum (no teste, um estudo de 2003 apareceu como novidade).
3. **Veja se checadores já falaram:** `firecrawl search "<termo> site:lupa.uol.com.br OR site:aosfatos.org OR site:projetocomprova.com.br" --country BR --limit 5 --json -o .firecrawl/check.json`.
4. **Paywall:** se a página lida veio com menos de ~200 caracteres de texto útil, é paywall ou bloqueio, não conteúdo — marque a fonte como *(não aberta — paywall)* e busque outra.
5. **Pista de patrocinado:** `patrocinado`, `dino`, `estudio`, `publieditorial`, `especial-publicitario` na URL.

Se o que viralizou não bate com a fonte primária, marque a tendência com **"⚠️ baseada em informação distorcida"** e explique a diferença em uma linha. O ângulo de post passa a ser corrigir, nunca repetir a manchete — o que costuma ser o melhor conteúdo da semana.

**4.2 Comentários e sentimento.** Nos 2–3 candidatos mais fortes **que tenham vídeo com audiência relevante** (centenas de comentários ou views bem acima dos vizinhos), baixe os comentários do vídeo de maior audiência. Em nicho local é comum só um candidato ter vídeo assim — tudo bem, diga isso:
```bash
bash $S/comentarios_youtube.sh "<url do vídeo>" 60
```
(Precisa do `yt-dlp`. Sem ele, o script avisa — pule e diga no relatório que os comentários não foram lidos.)

Leia os comentários de verdade — não conte palavras. Ironia engana contagem: "H2O faz mal à saúde, você pode se afogar!" (240 curtidas no teste) *defende* a creatina, apesar das palavras negativas. Tire:
- **clima:** proporção aproximada entre a favor / contra / com dúvida, pesando pelas curtidas;
- **as 3–5 dúvidas ou objeções mais repetidas** — cada uma é uma pauta pronta;
- **frases literais** do público, com as curtidas (servem de gancho).

**O relatório inteiro precisa ter pelo menos 2 comentários literais do público, citados entre aspas com a fonte e as curtidas, costurados no texto das tendências** (não numa seção separada) — ideia da skill last30days: a voz do público é o que mais convence. Fontes válidas: comentários do YouTube, e trechos de TikTok/Instagram/Reddit que a busca trouxe (marcados *do resumo da busca*). Se não houver 2, diga quantos achou.

**Desconte comentário de robô ou de torcida paga:** elogio genérico ("top", "ótimo conteúdo"), só emoji, texto sem relação com o vídeo, muitos iguais. Não conte no clima.

Diga sempre o tamanho da amostra ("60 comentários de 1 vídeo"): mostra o clima, não é pesquisa estatística.

**4.3 Tema sensível.** Marque com **⚠️** (não apague — a pessoa decide) quando o assunto envolver:
- morte, tragédia, doença grave, suicídio;
- política e eleições (redobre o cuidado em período eleitoral);
- crianças e adolescentes;
- promessa de cura, resultado de saúde, emagrecimento ou dinheiro;
- acusação contra pessoa ou empresa não comprovada (ex.: chamar algo de golpe antes de ter prova);
- regras do setor: saúde e suplementos (Anvisa, conselhos profissionais — nada de prometer cura ou efeito terapêutico), investimentos (CVM), direito (OAB), medicina (CFM), odontologia (CFO), estética (regras de antes/depois e preço dos conselhos). Quando for citar uma regra, busque a norma do conselho (`firecrawl search "<conselho> resolução publicidade <tema>" --country BR`); se não abrir, diga que é conhecimento geral não conferido.

Em cada ⚠️, diga em uma linha como falar do assunto sem se complicar.

## Passo 5 — Vendas (quando o nicho tem produto)

A lista de mais vendidos da Amazon Brasil abre pelo Firecrawl:
```bash
firecrawl scrape "https://www.amazon.com.br/gp/bestsellers" -o .firecrawl/amz.md
grep -oE "\[[^]]*\]\(https://www.amazon.com.br/gp/bestsellers/[^)]*\)" .firecrawl/amz.md   # lista as categorias; abra a do nicho e depois a SUBcategoria (ex.: Vitaminas, Minerais e Suplementos) — a categoria geral mistura tudo
```
Anote o top 10 e cruze com os candidatos (produto do assunto no top = fonte **Dinheiro ●**).

Limites medidos: Mercado Livre não abriu; **Hotmart não publica ranking de vendas** — a busca mostra quais cursos existem, não quais vendem mais. Nunca apresente curso como "mais vendido" sem número. Se o nicho não tem produto, pule este passo.

## Passo 6 — Histórico

Tendência é o que **sobe**; uma pesquisa só é uma foto. Pasta: `~/.tendencias/<nicho-em-slug>/`.

```bash
ls ~/.tendencias/<slug>/ 2>/dev/null
```
Se houver pesquisa anterior, leia a mais recente e marque cada assunto: **🆕 novo**, **⬆️ subindo** (mais fontes ● ou números maiores), **➡️ estável**, **⬇️ caindo** (listar no fim). Sem histórico, diga: "primeira pesquisa deste nicho — a partir da próxima dá para ver o que está subindo".

## Passo 7 — Entregar

```markdown
# Radar de tendências — <nicho> (<data>)
Janela: <semana/mês> · Público: <país> · Redes: <redes> · Candidatos checados: <n> de <n garimpados>

## Resumo em 3 linhas
<o que domina, a maior oportunidade (de preferência uma 🥇 lacuna) e o maior cuidado>

## Mapa de cruzamento
| Assunto | Procura | Atenção | Oferta | Conversa | Fato | Dinheiro | Diagnóstico | Nota | Decisão |
|---|---|---|---|---|---|---|---|---|---|
| <assunto> | ● +250% | ◐ 1,2x | ● | ◐ | ○ | — | 🥇 Lacuna | 🔴 | ✅ Vai |

## Tendências
### 1. <assunto> — 🥇 Lacuna · 🟢 Forte · 🆕 novo  [⚠️ se sensível ou distorcida]
**O que é:** <fato concreto, com número e data, conferido na fonte primária>
**O que o cruzamento mostrou:** <1–2 frases: onde é forte, onde é ausente, e o que isso significa>
**Curva:** <subindo / pico em dd/mm e caindo / pouco volume>
**Onde pesa mais:** <com filtro de estado: as 5 cidades com nota, ex.: "Teresópolis 100, Itaboraí 49, Niterói 47…"; sem filtro: os 5 estados. Obrigatório para negócio local — é a pista de onde anunciar>
**O que o público pensa:** <clima + 2–3 dúvidas + 1 frase literal com curtidas — só se leu comentários>
**Checagem:** <fonte primária confere? checador? — ou "⚠️ distorcida: viralizou X, o estudo diz Y">
**Cuidado:** <só se ⚠️ sensível: como falar sem se complicar>
**Decisão:** ✅ Vai / ⚠️ Cuidado / ⛔ Não vai — <motivo e prazo em uma linha>
**Fontes:** [título](url) · [título](url) *(não aberta)*
**Ideias de post:**
- **<rede>** (<formato>) — Gancho: "<primeira frase com o fato ou a frase do público>" — Ângulo: <o que entrega, coerente com o diagnóstico>

(repita para cada candidato checado; variações do mesmo assunto viram sub-itens)

## Caindo desde a última pesquisa
## Chegando de fora
## Garimpados e não checados
<lista curta dos candidatos que ficaram de fora, para a pessoa pedir checagem se quiser>

## Como foi feito
<n> buscas, <n> páginas lidas (<n> falharam), <n> comentários lidos, Google Trends <ok/limitado>. Limites: <o que não foi coberto>.
```

Ganchos citam o fato ou a frase literal do público, nunca frase genérica. Ideia por rede no formato nativo (YouTube: título; Reels/TikTok: primeiros 3 segundos; carrossel: capa; X/LinkedIn: primeira linha). O ângulo segue o diagnóstico: lacuna → explicar; fim de onda → "o que ficou"; distorcida → corrigir; armadilha → alertar.

## Passo 8 — Salvar

Relatório: `pesquisa-tendencias-<slug>-<AAAA-MM-DD>.md` em `~/pesquisas/` (crie a pasta se não existir: `mkdir -p ~/pesquisas`). É ali que a `/carrossel-viral` procura.

Histórico: `~/.tendencias/<slug>/<AAAA-MM-DD>.json`
```json
{"nicho":"...","data":"AAAA-MM-DD","janela":"semana","assuntos":[{"assunto":"...","termo":"...","fontes":{"procura":"forte","atencao":"forte","oferta":"fraco","conversa":"ausente","fato":"forte","dinheiro":"ausente"},"numeros":"+250% Trends; 347k/2d","diagnostico":"lacuna","nota":"forte"}]}
```

**Entrega como artifact (página).** Se a ferramenta `Artifact` estiver disponível, a entrega principal é uma **página publicada**, não o texto no chat:
1. Monte um HTML com o mesmo conteúdo do relatório: resumo em 3 cartões (domina / oportunidade / cuidado), o mapa de cruzamento como tabela com a coluna Decisão em pílulas coloridas (✅ verde, ⚠️ amarelo, ⛔ vermelho), cada tendência com seus campos e fontes clicáveis, os comentários literais em citação, e a seção "Como foi feito".
2. Use `references/exemplo-artifact.html` como modelo de estrutura e estilo (claro e escuro, legível no celular) — adapte paleta e título ao tema da pesquisa.
3. Siga o fluxo da ferramenta Artifact (quickstart/diretrizes de design que ela mandar) e publique; título curto com o nome do tema.
4. Na resposta do chat, dê o link da página e um resumo de 3–5 linhas — não repita o relatório inteiro.
Sem a ferramenta Artifact, mostre o relatório na conversa como antes. O `.md` e o `.json` de histórico são salvos sempre, nos dois casos.

## Conferência final (antes de entregar)

Responda sim/não para cada item e diga no "Como foi feito" o que ficou de fora:
- [ ] Nicho quebrado em termos específicos (e estado, se negócio local)
- [ ] Cidades (ou estados) de cada candidato escritas no relatório
- [ ] Google Trends consultado nos candidatos (ou marcado "não medido")
- [ ] Mesmo termo rodado em todas as fontes para cada candidato checado
- [ ] Estouro views ÷ inscritos medido nos vídeos principais
- [ ] Comentários lidos nos 2–3 mais fortes (ou dito que não foram) e ≥2 citados literalmente no relatório
- [ ] Fontes que falharam marcadas "?" (não medido), não "○"
- [ ] Cada tendência fechada com ✅ Vai / ⚠️ Cuidado / ⛔ Não vai
- [ ] Fonte primária aberta nos candidatos 🟢/🟡; checadores consultados se houver polêmica
- [ ] Temas sensíveis marcados ⚠️
- [ ] Histórico comparado (ou dito "primeira pesquisa")
- [ ] Relatório e JSON de histórico salvos
- [ ] Página publicada como artifact (se a ferramenta existir) e link entregue

## Regras de honestidade

- Nada de inventar número, fonte ou curtida. Fonte não aberta aparece marcada.
- Toda 🟢 ou 🟡 tem pelo menos um link aberto e lido.
- Número de fora não prova tendência aqui; pouco volume no Trends não sustenta conclusão forte.
- Não chame nada de golpe ou fraude sem prova — descreva o que foi visto ("vídeos anunciam 'invista R$ 1.000'") e marque ⚠️.
- Se o nicho for pequeno e houver pouco dado, diga isso em vez de encher linguiça.
