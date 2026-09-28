#!/bin/bash
# Uso: google_sugestoes.sh "<termo>" [pt-BR] [br]
# O que as pessoas DIGITAM no Google (autocompletar). Rode também com "<termo> é", "<termo> causa", "<termo> vale a pena", "<termo> golpe".
curl -s "https://suggestqueries.google.com/complete/search?client=firefox&hl=${2:-pt-BR}&gl=${3:-br}&q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1")" | python3 -c 'import json,sys;print("\n".join(json.load(sys.stdin)[1]))'
