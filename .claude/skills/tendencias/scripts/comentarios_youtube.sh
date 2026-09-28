#!/bin/bash
# Uso: comentarios_youtube.sh <url-do-video> [quantidade=60]
# Baixa os comentários mais curtidos (sem baixar o vídeo). Precisa do yt-dlp.
# Saída: curtidas | comentário
command -v yt-dlp >/dev/null || { echo "SEM yt-dlp: instale com 'brew install yt-dlp' ou 'pip install yt-dlp' — pulando comentários" >&2; exit 2; }
url="$1"; n="${2:-60}"; d=$(mktemp -d)
yt-dlp --skip-download --write-comments --extractor-args "youtube:max_comments=${n},all,0,0;comment_sort=top" -o "$d/v.%(ext)s" "$url" >/dev/null 2>&1
[ -f "$d/v.info.json" ] || { echo "FALHOU: não baixou comentários" >&2; exit 1; }
python3 - "$d/v.info.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); c=d.get("comments") or []
print(f"# {d.get('title')} — {d.get('channel')} — {d.get('view_count')} views — {len(c)} comentários")
for x in sorted(c,key=lambda x:-(x.get("like_count") or 0)):
    print(f"{x.get('like_count') or 0} | {x['text'][:220].replace(chr(10),' ')}")
PY
rm -rf "$d"
