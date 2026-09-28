#!/bin/bash
# Uso: youtube_numeros.sh "<termo>" [semana|mes] [pais] [idioma]
# Abre a busca do YouTube pelo Firecrawl e imprime: views | idade | título | link
termo="$1"; janela="${2:-semana}"; gl="${3:-BR}"; hl="${4:-pt-BR}"
[ "$janela" = "mes" ] && sp='EgIIBA%253D%253D' || sp='EgIIAw%253D%253D'
q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote_plus(sys.argv[1]))' "$termo")
out=$(mktemp)
firecrawl scrape "https://www.youtube.com/results?search_query=${q}&sp=${sp}&gl=${gl}&hl=${hl}" -o "$out" >/dev/null 2>&1
[ -s "$out" ] || { echo "FALHOU: YouTube não abriu" >&2; exit 1; }
res=$(python3 - "$out" <<'PY'
import re,sys
t=open(sys.argv[1]).read()
IDADE=r'(\d+\s?(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|[smhdwy]))\s?ago'
# Vídeos longos: bloco que começa em "### [título](url)"; views e idade vêm grudados ("28K3d ago")
blocos=re.split(r'\n(?=### \[)',t)
for bl in blocos:
    m=re.match(r'### \[(.+?)\]\((https://www\.youtube\.com/watch\?v=[\w-]+)',bl)
    if not m: continue
    g=re.search(r'\n\s*([\d.,]+[KMB]?)'+IDADE,bl)
    if g:
        v,idade=g.group(1),g.group(2)
        # sem K/M o número grudado na idade é ambíguo ("422h" = 42 views há 2h ou 4 views há 22h)
        if not re.search(r'[KMB]$',v): v=f"{v}? (ambíguo)"
    else: v,idade='?','?'
    print(f"{v} views | {idade} | {m.group(1)[:90]} | {m.group(2)}")
# Shorts: link do short seguido de "N views"
for m in re.finditer(r'\[([^\]]{8,200})\]\((https://www\.youtube\.com/shorts/[\w-]+)\)',t):
    tr=t[m.end():m.end()+300]
    v=re.search(r'([\d.,]+[KMB]?|No)\s*views',tr)
    if v: print(f"{v.group(1)} views | ? (short) | {m.group(1).strip()[:90]} | {m.group(2)}")
PY
)
if [ -n "$res" ]; then echo "$res"; else echo "0 resultados (a página abriu, mas nenhum vídeo com número foi lido)"; fi
rm -f "$out"
