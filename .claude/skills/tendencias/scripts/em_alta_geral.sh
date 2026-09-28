#!/bin/bash
# Uso: em_alta_geral.sh [BR]
# O que está em alta AGORA no país inteiro (Google Trends "em alta hoje"), sem nicho.
# Saída: tráfego aproximado | assunto | 1ª notícia ligada
geo="${1:-BR}"
curl -s "https://trends.google.com/trending/rss?geo=${geo}" | python3 -c "$(cat <<'PY'
import re, sys
t = sys.stdin.read()
itens = re.findall(r"<item>(.*?)</item>", t, re.S)
if not itens:
    print("0 resultados (o RSS não respondeu)")
    sys.exit()
for it in itens:
    tit = re.search(r"<title>([^<]*)", it)
    tr = re.search(r"<ht:approx_traffic>([^<]*)", it)
    nt = re.search(r"<ht:news_item_title>([^<]*)", it)
    trafego = tr.group(1) if tr else "?"
    assunto = tit.group(1) if tit else "?"
    noticia = nt.group(1)[:90] if nt else ""
    print(f"{trafego} | {assunto} | {noticia}")
PY
)"
