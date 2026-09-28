---
name: carrossel-viral
description: Escreve o TEXTO de um carrossel de Instagram feito para engajar e viralizar — 5 opções de gancho de capa, slides com cliffhanger, legenda e checagem de cada fato — a partir de uma pauta da /tendencias (ou de qualquer assunto) e na voz do perfil que vai postar. É a etapa depois da /tendencias e antes do design. Use sempre que pedirem "faz um carrossel sobre X", "transforma essa tendência em post", "escreve o carrossel pro perfil @Y", "quero um carrossel viral", "gancho pra capa do carrossel", "slides pra esse assunto", ou quando a pessoa acabou de rodar /tendencias e quer o próximo passo — mesmo sem dizer "viral". Não faz a arte (isso é outra etapa) nem copy de venda/página.
---

# Carrossel viral

Transforma um assunto em alta em texto de carrossel que para o scroll, segura até o último slide e pede salvar e enviar. Entrega **texto**, não arte: o design é a próxima etapa e vai ler o `carrossel.json` que esta skill salva.

Esta skill junta três skills de terceiros (licença MIT), guardadas **íntegras** em `references/fontes/` — de onde saem as regras de estrutura e os padrões de gancho. O que está aqui no SKILL.md é o **método de uso** dessas fontes em português, mais o que o teste real ensinou. Origem e commits: `references/fontes/ORIGEM.md`.

| Fonte | Para que serve aqui |
|---|---|
| `carousel-writer-sms.md` | espinha dorsal: 4 zonas, 1 ideia por slide, limites de palavras, formatos, regras do Instagram |
| `viral-hook-creator.md` + `-hook-patterns.md` + `-trigger-words.md` | 19 padrões de gancho com molde, matriz padrão × objetivo, palavras-gatilho |
| `hook-writer-sms.md` | 9 padrões (inclui Empatia e Confissão), gerar variantes e marcar a recomendada, autoteste |

## Passo 1 — Juntar as duas entradas

Precisa de duas coisas. Pergunte só o que faltar, numa mensagem:

1. **A pauta.** Se veio da /tendencias, o relatório está em `~/pesquisas/pesquisa-tendencias-<nicho>-<data>.md` (e o histórico em `~/.tendencias/<nicho>/<data>.json`). Se a pessoa não disser qual, liste as de hoje (`ls -t ~/pesquisas/pesquisa-tendencias-*`) com o assunto mais forte de cada e deixe escolher. Assunto solto, sem relatório, também serve — mas aí todo número precisa de fonte que você buscar.
2. **O perfil que vai postar.** Um @ do Instagram, ou "o meu perfil".

## Passo 2 — Ler a pauta como fonte de fatos

Do relatório, anote antes de escrever:
- **os números e fatos exatos** (com o que eles medem — índice do Google Trends é procura *relativa*, não volume);
- **as dúvidas reais** que as pessoas buscam (autocompletar) — viram o conteúdo dos slides;
- **o "Cuidado"** e a **Decisão**. ⛔ Não vai → não escreva, diga por quê. ⚠️ Cuidado → o carrossel desvia do risco (ex.: tema de saúde: falar de sabor/uso, nunca de efeito).
- **Se só existir o JSON de histórico** (`~/.tendencias/...json`, sem o `.md`): ele traz só nota e uma linha de números por assunto, sem dúvidas, cuidado nem decisão. Avise isso no `.md` de saída, trate número ambíguo como ambíguo (não use no slide) e marque os slides do meio como vindos do conhecimento do perfil, não de dúvida medida.
- **o recorte geográfico** de cada dado. Não junte dois relatórios em uma afirmação que nenhum dos dois faz (no teste: "alerta de onda de calor" era para 8 estados sem nomear SP — não dava para dizer "SP em alerta").

## Passo 3 — Ler a voz do perfil

A voz decide mais do que parece: no teste, a recomendação técnica de gancho (o mais provocativo) perdeu para o de empatia porque a marca é carinhosa. Então leia antes de escrever.

- **"Meu perfil" (o da própria pessoa):** faça um briefing curto, numa mensagem só: marca, @, nicho, público, tom de voz em 3 palavras e 1 post dela de que ela gosta. Salve as respostas em `~/carrosseis/<perfil-sem-@>/perfil.md` e, nas próximas vezes, leia de lá em vez de perguntar de novo.
- **@ de Instagram:** uma execução do Apify `apify/instagram-scraper` com `resultsType: "details"` traz a bio **e** os ~12 posts recentes (campo `latestPosts`); teto `maxTotalChargeUsd: 0.2`. Leia o item inteiro (sem filtrar campos — o filtro de campos esconde `latestPosts`). Firecrawl e navegador não abrem o Instagram de forma confiável.

Monte uma **ficha de voz** curta (fica no .md de saída): caixa (tudo minúsculo?), pessoa (a gente / eu / você), emojis que usa, gírias e marcas próprias (ex.: "do jeito zinn"), tamanho típico de legenda, e **produtos/itens reais citados** — só esses podem aparecer nos slides. Preço só se aparecer no perfil.

**Assunto que o perfil não tem** (ex.: pauta de pistache, perfil sem nada de pistache): não invente produto. Numa conversa, pergunte se a casa tem ou vai lançar; sem poder perguntar, troque o slide de prova por enquete ("pistache no zinn: latte, bolo ou creme?") e registre na checagem.

## Passo 4 — Ler as fontes

Leia os 5 arquivos de `references/fontes/` **inteiros** — somam ~1.300 linhas; se a leitura vier cortada, leia em partes (offset) até o fim. Nos testes, dois agentes leram pela metade e perderam a matriz padrão × objetivo. Eles citam arquivos que não existem aqui (`.agents/social-media-context-sms.md`, `FOUNDER_CONTEXT.md`, skills irmãs) — a ficha de voz do Passo 3 faz esse papel. Os "~10x engajamento" do viral-hook-creator não têm fonte: não repita.

## Passo 5 — Cinco ganchos de capa

Siga o processo do `hook-writer-sms` (gerar variantes, rotular o padrão, marcar a recomendada) usando as duas bibliotecas de padrões juntas:

- **5 ganchos, cada um de um padrão diferente.** Garanta pelo menos um de **Empatia** ou **Confissão** (hook-writer) — em marca de tom afetivo eles costumam ganhar.
- **Escreva em português de gente, não traduza o molde.** As palavras-gatilho do `trigger-words` são em inglês; use o equivalente natural (*secretly* → "ninguém te conta", *bleeding* → "tá roubando", *backwards* → "é ao contrário"). Se soar dublado, reescreva.
- **Na voz da ficha** (caixa, emojis, pessoa).
- **Capa curta:** o título da capa entra no limite de 8 palavras; o resto vira subtítulo.
- **Recomendação pesa a voz, não só a força do gancho.** Diga em uma frase por que a recomendada combina com *este* perfil.

## Passo 6 — Os slides

Siga a estrutura do `carousel-writer-sms` (capa → contexto → corpo → CTA) e as regras dele de Instagram. O que o teste mostrou que mais importa:

- **Escolha o formato** pela pauta: dúvida de "como fazer" → Framework ou Antes/Depois (erro → acerto); lista de coisas → Listicle; dado forte → Data storytelling.
- **Slide 2 (contexto) prova a promessa da capa** com o fato da pauta — é onde o número da tendência entra. No máximo 2 frases.
- **Um slide de prova do perfil** antes do CTA (o produto/serviço real da ficha), sem virar anúncio.
- **CTA de Instagram:** pedir **salvar** e **enviar para alguém** (os dois sinais que mais pesam), com a voz do perfil.
- **Cada slide do meio termina puxando o próximo** (→, "o segredo tá no próximo", número parcial).
- **Não ensine o que o perfil pode não praticar.** Técnica genérica (receita, procedimento) entra na checagem com status `ajustado` e a nota "confirmar com a pessoa" na fonte — o conferidor só aceita `confirmado`, `ajustado` ou `removido`.

## Passo 7 — Legenda

Gancho na 1ª linha (até 125 caracteres, antes do "...mais") — pode usar o gancho de dado que não foi para a capa. Depois, uma frase que manda arrastar, o CTA de salvar/visitar, uma pergunta para comentário e 3–5 hashtags. Tom e emojis da ficha.

## Passo 8 — Checagem

Para **cada** número, fato, produto e afirmação técnica do carrossel e da legenda, registre: de onde veio (linha da pauta, post do perfil) e o status — `confirmado`, `ajustado` (reescrito para caber no que a fonte diz) ou `removido`. Nada fica sem status. Palavra de gênero ("obcecada", "cansado") só se o público do perfil for claramente de um gênero; na dúvida, frase neutra. Em tema de saúde, dinheiro ou lei: sem promessa de efeito.

## Passo 9 — Salvar e conferir

Salve em `~/carrosseis/<perfil-sem-@>/<AAAA-MM-DD>-<assunto-em-slug>/`:

- `carrossel.md` — para ler: ficha de voz, 5 ganchos (recomendada marcada), tabela de slides, legenda, checagem.
- `carrossel.json` — para a etapa de design:

```json
{
  "perfil": "ocafezinn",
  "pauta": {"assunto": "Café gelado", "relatorio": "/Users/.../pesquisa-tendencias-cafeteria-sp-2026-09-27.md"},
  "voz": {"caixa": "minuscula", "emojis": ["🩷", "🧡"], "pessoa": "a gente"},
  "capas": [{"padrao": "Empatia", "titulo": "...", "subtitulo": "...", "recomendada": true}],
  "formato": "antes-depois",
  "slides": [
    {"n": 1, "papel": "capa", "titulo": "...", "texto": "..."},
    {"n": 2, "papel": "contexto", "titulo": "", "texto": "..."},
    {"n": 9, "papel": "cta", "titulo": "frase-resumo", "texto": "..."}
  ],
  "legenda": "...",
  "hashtags": ["#..."],
  "checagem": [{"afirmacao": "...", "fonte": "...", "status": "confirmado"}]
}
```

`papel` ∈ capa, contexto, corpo, prova, cta. Os slides usam a capa recomendada; se a pessoa escolher outra, troque o slide 1 e salve de novo.

Depois rode a conferência de tamanho:

```bash
python3 ~/.claude/skills/carrossel-viral/scripts/conferir.py ~/carrosseis/<perfil>/<pasta>/carrossel.json
```

Reprovou → corte o texto e rode de novo. Só apresente depois de aprovado.

## Passo 10 — Apresentar

Em linguagem de gente, curto: os 5 ganchos (recomendada e por quê), a tabela de slides (título | texto | palavras), a legenda, o que foi conferido e o que **não** foi (ex.: tamanho de letra na arte fica para o design; receita da casa a confirmar). Link para o `.md`. Termine com **uma** pergunta: qual capa ela escolhe.
