#!/usr/bin/env python3
"""Google Trends direto do computador do usuário (pelo Firecrawl o Google devolve erro 429).
Uso: python3 google_trends.py "<termo>" [BR | BR-RJ | BR-SP ...] [today 3-m | today 1-m | now 7-d]
Imprime: interesse (0-100), regiões (proporção, não volume), buscas relacionadas EM ALTA (com %) e TOP.
Cada parte é independente: se uma vier vazia (pouco volume), as outras continuam."""
import json, os, subprocess, sys, tempfile, urllib.parse

termo = sys.argv[1]
geo = sys.argv[2] if len(sys.argv) > 2 else "BR"
tempo = sys.argv[3] if len(sys.argv) > 3 else "today 3-m"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
ck = tempfile.mktemp()


def curl(url):
    return subprocess.run(["curl", "-s", "-b", ck, "-c", ck, "-A", UA, url], capture_output=True, text=True).stdout


def json_do_google(texto):
    # o Google prefixa as respostas com ")]}'" — pula até o primeiro "{"
    return json.loads(texto[texto.index("{"):])


def dados(caminho, widget):
    q = urllib.parse.urlencode({"hl": "pt-BR", "tz": "180", "req": json.dumps(widget["request"]), "token": widget["token"]})
    return json_do_google(curl(f"https://trends.google.com/trends/api/widgetdata/{caminho}?{q}"))


def interesse(w):
    pontos = dados("multiline", w)["default"]["timelineData"]
    print("INTERESSE (0-100):", " ".join(f"{x['formattedTime']}={x['value'][0]}" for x in pontos[-14:]))


def regioes(w):
    g = dados("comparedgeo", w)["default"]["geoMapData"]
    vals = [(x["geoName"].replace("State of ", ""), x["value"][0]) for x in g if x["value"][0] > 0]
    print("REGIÕES (proporção, não volume):", "; ".join(f"{n}={v}" for n, v in vals[:8]) or "sem dado")


def relacionadas(w):
    listas = dados("relatedsearches", w)["default"]["rankedList"]
    print("EM ALTA:", "; ".join(f"{k['query']} ({k['formattedValue']})" for k in listas[1]["rankedKeyword"][:15]) or "nenhuma")
    print("TOP:", "; ".join(k["query"] for k in listas[0]["rankedKeyword"][:10]) or "nenhuma")


PARTES = {"TIMESERIES": ("INTERESSE", interesse), "GEO_MAP": ("REGIÕES", regioes), "RELATED_QUERIES": ("BUSCAS RELACIONADAS", relacionadas)}

try:
    curl(f"https://trends.google.com/trends/?geo={geo.split('-')[0]}")  # pega o cookie
    req = {"comparisonItem": [{"keyword": termo, "geo": geo, "time": tempo}], "category": 0, "property": ""}
    r = curl("https://trends.google.com/trends/api/explore?" + urllib.parse.urlencode({"hl": "pt-BR", "tz": "180", "req": json.dumps(req)}))
    try:
        widgets = json_do_google(r)["widgets"]
    except Exception:
        sys.exit("FALHOU: Google Trends não respondeu (provável limite de pedidos) — espere alguns minutos e tente de novo")
    for w in widgets:
        if w["id"] in PARTES:
            nome, fn = PARTES[w["id"]]
            try:
                fn(w)
            except Exception:
                print(f"{nome}: sem dado (pouco volume — tente um termo mais curto/amplo)")
finally:
    if os.path.exists(ck):
        os.remove(ck)
