# Canais para obter stories

Resumo de cada canal disponível, o que ele devolve e onde costuma falhar.

## 1. Prints e gravação de tela

Serve para qualquer conta. Julio abre o story no celular e tira um print
por card (visão de seguidor) ou abre pelo próprio perfil (visão do dono,
com o número de visualizações no rodapé). Gravação de tela funciona
igual: extraia quadros e descarte repetidos.

```bash
ffmpeg -i gravacao.mp4 -vf fps=1 quadros/quadro_%03d.png
```

Se `ffmpeg` não existir no ambiente, `pip install imageio-ffmpeg` traz um
binário em `python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"`.
Se nada disso for viável, peça os prints.

Leia as imagens diretamente (ferramenta de leitura de arquivo aceita PNG
e JPG). Não é preciso OCR separado.

## 2. Windsor.ai — conector `instagram`

Só cobre contas conectadas no Windsor (a @kindoperfumaria). Chame
`get_fields` antes de `get_data` se precisar confirmar um campo.

Campos de story confirmados no conector:

| Campo | O que é |
|---|---|
| `story_id` | id do story |
| `story_timestamp` | data e hora de publicação |
| `story_permalink` | link permanente |
| `story_thumbnail_url` | miniatura (stories em vídeo) |
| `story_views` | visualizações |
| `story_reach` | contas únicas alcançadas |
| `story_replies` | respostas |
| `story_shares` | compartilhamentos |
| `story_interactions` | likes + comentários + salvos + compartilhamentos |
| `story_exits` | saídas |
| `story_swipe_forward` | arrastou para o próximo perfil |
| `story_taps_forward` | tocou para o próximo card |
| `story_taps_back` | tocou para voltar |
| `replies` | respostas de stories no dia (tabela do perfil) |

Chamada típica:

```
get_data(
  connector="instagram",
  fields=["story_id","story_timestamp","story_permalink","story_thumbnail_url",
          "story_views","story_reach","story_replies","story_shares",
          "story_exits","story_taps_forward","story_taps_back","story_swipe_forward"],
  date_preset="last_7dT"
)
```

A conta da Kindo no Windsor é a `17841432233383494` ("Kindo Perfumaria
(kindoperfumaria)"). Passe `accounts=["17841432233383494"]` para manter a
resposta pequena.

Limites: a API da Meta só expõe métricas de story por 24 horas; o Windsor
guarda o histórico do que já coletou, então dias anteriores podem ou não
aparecer. O conector não traz a imagem do story nem o texto na tela; para
saber o conteúdo, junte com prints ou com a thumbnail.

Tabelas de story vazias (`story_id` sem linhas) enquanto a tabela de perfil
responde normalmente significam uma de duas coisas: não houve story no
período, ou o Windsor não coletou. Não dá para distinguir de dentro da
sessão, então relate o que veio ("o Windsor não devolveu nenhum story") sem
afirmar que a loja não postou.

O aviso "needs you to sign in again" às vezes aparece em `get_connectors`
mesmo com o conector funcionando. Antes de concluir que está
desautenticado, tente um `get_data` direto no conector `instagram`. Se o
`get_data` também falhar por autenticação, aí sim o conector precisa ser
reautenticado por Julio nas configurações de conectores do claude.ai; não
há como fazer isso de dentro da sessão.

## 3. Conector Meta (Ads MCP)

Sequência: `ads_get_ad_accounts` → escolher a conta com
`is_ads_mcp_enabled = true` → `ads_get_ig_accounts(ad_account_id)` →
`ads_get_ig_media(ad_account_id, ig_account_id, filters='[{"field":"product_type","operator":"in","value":["STORY"]}]')`.

Devolve legenda, tipo de mídia, permalink e id. Não devolve métricas.
Situação em setembro de 2026: a conta "CA - Kindo Perfumaria"
(1907538119806342) está com `is_ads_mcp_enabled = false` ("gradually being
rolled out"), e a conta pessoal de Julio não tem Instagram vinculado
(`ig_accounts` vazio). Verifique de novo a cada uso; quando liberar, este
canal passa a funcionar sem mudança na skill.

Toda chamada Meta exige `client_conversation_id` (20 caracteres
alfanuméricos, o mesmo em toda a conversa) e `advertiser_request` com as
palavras de Julio.

## 4. API do Instagram (Graph API) com token

`scripts/stories_api.py` faz o trabalho completo:

```bash
export IG_ACCESS_TOKEN="EAAB..."        # token de usuário ou de página com instagram_basic + instagram_manage_insights
export IG_USER_ID="1784..."             # opcional; descoberto via /me/accounts se ausente
python3 scripts/stories_api.py --out ./stories_hoje
```

Saída: `stories_hoje/stories.json` (lista ordenada por horário com mídia,
legenda, permalink e insights) e os arquivos de mídia baixados
(`01_<id>.jpg`, `02_<id>.mp4`...). Abra as imagens para descrever o
conteúdo; para vídeo, extraia quadros como no canal 1.

Endpoints usados:

- `GET /{ig-user-id}/stories?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,permalink`
- `GET /{story-id}/insights?metric=views,reach,replies,shares,total_interactions,navigation&breakdown=story_navigation_action_type`

Quando um insight não está disponível (story com poucas views, métrica
descontinuada na versão da API), o script registra o erro no JSON e segue.
`graph.facebook.com` é acessível pelo proxy deste ambiente.

`--json-in arquivo.json` reprocessa um JSON já baixado sem chamar a API.

### Posts públicos de concorrentes (Business Discovery)

```bash
python3 scripts/stories_api.py --discovery perfumariaxyz --out ./concorrente_xyz
```

Endpoint: `GET /{ig-user-id-da-kindo}?fields=business_discovery.username(<usuario>){username,name,followers_count,media_count,biography,media.limit(25){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}}`.

Só funciona para contas Business ou Creator públicas; conta pessoal
devolve erro "(#110) ... not a business account" e aí só restam os prints.
Não inclui stories, nem de contas públicas: a API da Meta só expõe stories
da própria conta autenticada.

Saída: `<out>/discovery.json` e a mídia baixada. Resuma os posts com o
mesmo formato de card a card, trocando "views" por curtidas e comentários.

### Como obter o token (`IG_ACCESS_TOKEN`)

Sem o token, nem os stories da Kindo nem os posts públicos de concorrentes
saem pela API. Julio gera o token uma vez:

1. Em developers.facebook.com, criar um app do tipo "Empresa" (ou usar um
   existente) e adicionar o produto "Instagram Graph API".
2. Abrir o Graph API Explorer, escolher o app, e em "Permissões" marcar
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement` e `business_management`. Clicar em "Generate
   Access Token" e autorizar com o Facebook que administra a página
   "Kindo Perfumaria".
3. Trocar o token curto por um de longa duração (60 dias) em
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<app_id>&client_secret=<app_secret>&fb_exchange_token=<token_curto>`.
4. Guardar o token no ambiente do Claude Code: menu do ambiente na barra de
   título da sessão, "Edit", variável de ambiente `IG_ACCESS_TOKEN` (e
   opcionalmente `IG_USER_ID` = 17841432233383494). Uma sessão nova já
   enxerga a variável. Nunca colar o token no chat.

Enquanto o app estiver em modo de desenvolvimento, só os usuários do app
conseguem gerar token, o que basta para uso próprio.

### Biblioteca de Anúncios (anúncios pagos de qualquer página)

`ads_library_search` do conector Meta funciona sem token e sem vínculo com
a página pesquisada. Testado em 27/09/2026 com `countries=["BR"]`.

- Devolve por anúncio: `page_name`, `page_id`, `ad_creative_link_title`,
  datas de criação e início, `ad_snapshot_url`, e `estimated_total_count`.
- Não devolve o texto do anúncio nem a imagem; o snapshot exige login e
  não abre daqui (403). Julio abre o link no navegador.
- `search_terms` busca no texto do criativo, não no nome da página. Para
  uma concorrente específica, use `page_ids` com o ID da página dela
  (aparece na aba "Sobre" ou "Transparência da página" no Facebook), com
  `ad_active_status="ACTIVE"`.
- Uso na skill: dizer se a concorrente está anunciando, quantos anúncios
  ativos, desde quando, e a chamada do botão. Não confundir com stories.

### Serviços externos de coleta de stories

Existem serviços pagos (Apify "Instagram Story Scraper" e similares) que
entregam stories de contas públicas via API. Eles funcionam por scraping,
o que a Meta proíbe nos termos de uso e combate judicialmente; a conta
que paga o serviço não é a que corre risco, mas a coleta pode parar sem
aviso. Use somente se Julio contratar por conta própria e pedir
explicitamente; nesse caso ele fornece o token e a URL do dataset, e o
resultado entra pelo `--json-in` depois de convertido para o formato do
`stories.json` (campos `id`, `media_type`, `media_url`, `timestamp`,
`caption`). Não cadastre nem acione esses serviços por iniciativa própria.

## Teste feito em 27/09/2026

Sem login, deste ambiente: `instagram.com/<conta>/` redireciona para
login (302), `instagram.com/stories/<conta>/` devolve a página de login,
`api/v1/users/web_profile_info` devolve 401 e `i.instagram.com/api/v1/feed/reels_media`
devolve 400. Vale para contas públicas também. Não adianta tentar de novo
com outro user-agent.

## O que não fazer

- Não acessar `instagram.com/stories/<conta>/` por curl ou navegador
  automatizado: exige login e o conteúdo vem vazio ou bloqueado.
- Não usar sites de "ver stories anonimamente".
- Não pedir usuário e senha do Instagram.
