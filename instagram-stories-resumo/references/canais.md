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

Limites: a API da Meta só expõe métricas de story por 24 horas; o Windsor
guarda o histórico do que já coletou, então dias anteriores podem ou não
aparecer. O conector não traz a imagem do story nem o texto na tela; para
saber o conteúdo, junte com prints ou com a thumbnail.

Se a chamada voltar "needs you to sign in again", o conector precisa ser
reautenticado por Julio nas configurações de conectores do claude.ai.
Não há como fazer isso de dentro da sessão.

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

## O que não fazer

- Não acessar `instagram.com/stories/<conta>/` por curl ou navegador
  automatizado: exige login e o conteúdo vem vazio ou bloqueado.
- Não usar sites de "ver stories anonimamente".
- Não pedir usuário e senha do Instagram.
