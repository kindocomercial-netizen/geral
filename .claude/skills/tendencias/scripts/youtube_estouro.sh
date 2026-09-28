#!/bin/bash
# Uso: youtube_estouro.sh <url-do-video> [<url> ...]
# Mede se o vídeo estourou PARA O TAMANHO DO CANAL: razão = views ÷ inscritos.
# Razão > 10 = estouro; 1–10 = acima do normal; < 1 = normal para o canal. Precisa do yt-dlp.
command -v yt-dlp >/dev/null || { echo "SEM yt-dlp: instale com 'brew install yt-dlp' ou 'pip install yt-dlp'" >&2; exit 2; }
for url in "$@"; do
  yt-dlp --skip-download -j "$url" 2>/dev/null | python3 -c "$(cat <<'PY'
import json, sys
url = sys.argv[1]
try:
    d = json.load(sys.stdin)
except Exception:
    print(f"FALHOU | não consegui ler {url}")
    sys.exit()
v = d.get("view_count") or 0
s = d.get("channel_follower_count")
r = round(v / s, 1) if s else None
if r is None:
    leitura = "?"
elif r > 10:
    leitura = "ESTOURO"
elif r >= 1:
    leitura = "acima do normal"
else:
    leitura = "normal para o canal"
titulo = (d.get("title") or "")[:70]
print(f"{r}x ({leitura}) | {v} views | {s} inscritos | {d.get('channel')} | {d.get('upload_date')} | {titulo}")
PY
)" "$url"
done
