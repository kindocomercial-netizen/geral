---
name: instagram-stories-resumo
description: Vê os stories de uma conta do Instagram e entrega um resumo objetivo do que foi postado — ordem dos cards, produtos e preços, textos na tela, enquetes, links e CTAs, e as métricas de visualização quando a conta é da Kindo. Funciona a partir de prints ou gravação de tela enviados por Julio (qualquer conta, inclusive concorrentes) ou puxando os stories da @kindoperfumaria via Windsor.ai, conector Meta ou API do Instagram. Use sempre que Julio mandar prints de stories, pedir "resume os stories", "o que a loja X postou hoje", "como foram meus stories", "qual story teve mais visualização", ou quiser saber o que uma conta está publicando nos stories — mesmo sem usar a palavra "resumo".
---

# Resumo de stories do Instagram

Julio quer saber, sem abrir o celular, o que uma conta publicou nos stories:
a própria @kindoperfumaria (para conferir o que a equipe postou e como foi
a audiência) ou uma concorrente (para acompanhar preço e ação). O produto
final é um resumo curto, em português, que ele lê em um minuto e que
reproduz com fidelidade o que estava em cada card.

## Como chegar nos stories

Stories somem em 24 horas e não existe API pública para ver stories de
contas de terceiros. Por isso a fonte muda conforme o caso. Tente nesta
ordem e pare na primeira que funcionar:

1. **Material enviado na conversa** (prints, gravação de tela, fotos do
   celular). É o único caminho para contas que não são da Kindo e o mais
   confiável para qualquer conta, porque você vê exatamente o que o
   seguidor viu. Se Julio mandou imagens, comece por elas e não gaste
   tempo com API.
2. **Windsor.ai, conector `instagram`** — traz id, horário, permalink,
   thumbnail e as métricas de cada story da conta conectada (views,
   alcance, respostas, compartilhamentos, saídas, toques para frente e
   para trás). Use quando o pedido for sobre a conta da Kindo e envolver
   números.
3. **Conector Meta** (`ads_get_ig_accounts` → `ads_get_ig_media` com filtro
   `product_type = STORY`) — lista os stories com legenda e link. Hoje a
   conta de anúncios da Kindo ainda não está liberada nesse conector; se
   `ads_get_ig_accounts` voltar vazio, siga adiante sem insistir.
4. **API do Instagram com token** — `scripts/stories_api.py` lista os
   stories ativos, baixa a mídia para você olhar e puxa os insights.
   Exige `IG_ACCESS_TOKEN` no ambiente.

Detalhes de campos, chamadas e limites de cada canal estão em
`references/canais.md`. Leia quando for usar os canais 2 a 4.

Não faça scraping de instagram.com, não use "visualizadores anônimos de
stories" e nunca peça a senha do Instagram de Julio. Além de violarem os
termos da plataforma, esses caminhos derrubam a conta da loja.

### Quando nenhum canal responde

Diga isso em duas linhas, sem rodeio, e peça o material: um print de cada
card (abrir o story, tirar print, tocar para o próximo) ou uma gravação de
tela passando pelos stories. Se o Windsor pedir autenticação, avise que é
preciso reconectar o conector nas configurações do claude.ai. Nunca
descreva um story que você não viu — um resumo inventado é pior que
nenhum, porque Julio toma decisão de preço em cima dele.

## Como ler cada card

Um print de story carrega mais informação do que parece. Extraia sempre:

- **Posição e total**: a barra segmentada no topo mostra quantos cards
  existem e qual é este. Use para ordenar e para saber se faltou print.
- **Horário**: o "3h", "45 min" ao lado do @ é a idade do card. Tempo
  maior = publicado antes. Se a ordem dos prints contradizer os horários,
  confie nos horários.
- **Conta**: o @ ao lado da foto de perfil. Em repost aparece a conta
  original como menção no card.
- **Texto na tela e legenda**: transcreva preços exatamente como estão
  (de/por, parcelamento, "a partir de"). Preço errado no resumo vira preço
  errado na loja.
- **Produto**: marca, linha, volume, cor quando visível.
- **Stickers**: enquete (com as opções), caixa de perguntas, link (o texto
  do botão), contagem regressiva, localização, música, menção, hashtag.
  São os elementos de conversão; anote o que cada um pede ao seguidor.
- **Tipo**: foto, vídeo, texto sobre fundo, repost de cliente, colab.
- **Visualizações**: quando o print é da visão de quem publicou, aparece o
  número de visualizações no rodapé. Registre por card.

Gravação de tela: extraia um quadro por segundo com ffmpeg
(`ffmpeg -i video.mp4 -vf fps=1 quadro_%03d.png`), descarte quadros
repetidos e trate cada card como um print. Sem ffmpeg, peça os prints.

## Como montar o resumo

Use o modelo de `references/modelo-resumo.md`. Em resumo:

```
# Stories @conta — dia/mês
N stories entre HHhMM e HHhMM. Tema do dia em uma frase.

## Card a card
1. HHh · tipo · o que mostra · preço/oferta · sticker/CTA · [views se houver]
2. ...

## Leitura geral
- Mensagem principal e ofertas (preços listados)
- Chamadas para ação e para onde levam
- Métricas: onde a audiência entrou e onde saiu (só com dados)
```

Regras que fazem diferença para Julio:

- Card a card é a parte que ele confere contra o celular; seja literal.
  A "Leitura geral" é onde você interpreta.
- Preços e nomes de produto sempre em lista, nunca dissolvidos em prosa.
- Com métricas, calcule a retenção (views do último card ÷ views do
  primeiro) e aponte o card com maior queda. Saídas e toques para frente
  altos indicam card fraco; respostas e toques para trás indicam interesse.
  Views de print podem subir de um card para o próximo (gente que entrou
  depois, direto no card novo); trate a queda como sinal, não como contagem
  exata de saídas, e diga quando a audiência se recuperou.
- Sem métricas (print de seguidor, sem números), não escreva uma linha de
  métricas para dizer que não há métricas. Se fizer sentido, ofereça em uma
  frase no fim puxar os números pelo Windsor.
- Sugestões só quando ele pedir ou quando o padrão for evidente (por
  exemplo, preço sem chamada para ação em todos os cards). No máximo três,
  concretas.
- Conta de concorrente: destaque preços comparáveis com o mix da Kindo
  (perfumaria, corpo, proteção solar) e mecânicas de promoção que possam
  ser replicadas.
- Se um card estiver ilegível ou cortado, diga qual e o que não deu para
  ler. Não complete com suposição.

## Exemplo curto

Entrada: 3 prints da @kindoperfumaria, visão do dono.

```
# Stories @kindoperfumaria — 27/09
3 stories entre 9h e 14h. Segunda do Preço de Custo com dois itens e uma enquete.

## Card a card
1. 9h · foto do produto · Kaiak Aventura 100ml · de R$ 189,90 por R$ 119,90 · texto "só hoje" · 412 views
2. 11h · enquete · "Qual você prefere?" Malbec 44% × Essencial 56% · 388 views
3. 14h · foto · Episol Color FPS70 · R$ 89,90 · link "Comprar no WhatsApp" · 201 views

## Leitura geral
- Oferta do dia: Kaiak Aventura a R$ 119,90; Episol Color a R$ 89,90.
- Único CTA está no card 3, que foi o menos visto (49% de retenção).
- Queda maior entre o card 2 e o 3: a enquete segurou, o card de venda perdeu metade.
```
