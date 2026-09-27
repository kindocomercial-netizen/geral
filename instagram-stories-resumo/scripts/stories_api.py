#!/usr/bin/env python3
"""Lista os stories ativos de uma conta Instagram Business via Graph API,
baixa a mídia e puxa os insights de cada story.

Uso:
    export IG_ACCESS_TOKEN="EAAB..."   # instagram_basic + instagram_manage_insights
    export IG_USER_ID="1784..."        # opcional
    python3 stories_api.py --out ./stories_hoje

    python3 stories_api.py --json-in stories.json --out ./reprocessado   # sem chamar a API

Saída: <out>/stories.json e os arquivos de mídia numerados na ordem de
publicação. Erros de insight ficam registrados por story, sem interromper.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests

GRAPH = "https://graph.facebook.com/v21.0"
STORY_FIELDS = "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink,username"
INSIGHT_METRICS = ["views", "reach", "replies", "shares", "total_interactions"]


def get(path, token, **params):
    params["access_token"] = token
    r = requests.get(f"{GRAPH}/{path}", params=params, timeout=30)
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"].get("message", str(data["error"])))
    return data


def discover_ig_user(token):
    """Encontra o Instagram Business vinculado às páginas do usuário do token."""
    pages = get("me/accounts", token, fields="id,name,instagram_business_account{id,username}")
    found = []
    for p in pages.get("data", []):
        ig = p.get("instagram_business_account")
        if ig:
            found.append((ig["id"], ig.get("username", "?"), p.get("name", "?")))
    if not found:
        raise RuntimeError("Nenhuma conta Instagram Business vinculada às páginas deste token. "
                           "Informe IG_USER_ID manualmente.")
    if len(found) > 1:
        print("Mais de uma conta encontrada; usando a primeira. Passe IG_USER_ID para escolher:", file=sys.stderr)
        for ig_id, user, page in found:
            print(f"  {ig_id}  @{user}  (página {page})", file=sys.stderr)
    return found[0][0]


def fetch_stories(token, ig_user_id):
    items = []
    data = get(f"{ig_user_id}/stories", token, fields=STORY_FIELDS, limit=50)
    items.extend(data.get("data", []))
    while data.get("paging", {}).get("next"):
        r = requests.get(data["paging"]["next"], timeout=30)
        data = r.json()
        items.extend(data.get("data", []))
    items.sort(key=lambda s: s.get("timestamp", ""))
    return items


def fetch_insights(token, story_id):
    out, errors = {}, []
    try:
        data = get(f"{story_id}/insights", token, metric=",".join(INSIGHT_METRICS))
        for m in data.get("data", []):
            vals = m.get("values") or []
            out[m["name"]] = vals[0].get("value") if vals else m.get("total_value", {}).get("value")
    except RuntimeError as e:
        errors.append(f"metricas basicas: {e}")
        # tenta uma a uma, porque uma métrica indisponível derruba a chamada inteira
        for metric in INSIGHT_METRICS:
            try:
                data = get(f"{story_id}/insights", token, metric=metric)
                for m in data.get("data", []):
                    vals = m.get("values") or []
                    out[m["name"]] = vals[0].get("value") if vals else None
            except RuntimeError as e2:
                errors.append(f"{metric}: {e2}")
    try:
        nav = get(f"{story_id}/insights", token, metric="navigation",
                  breakdown="story_navigation_action_type")
        for m in nav.get("data", []):
            tv = m.get("total_value", {})
            for bd in tv.get("breakdowns", []):
                for res in bd.get("results", []):
                    key = "_".join(res.get("dimension_values", ["navigation"])).lower()
                    out[f"navigation_{key}"] = res.get("value")
            if "value" in tv:
                out["navigation_total"] = tv["value"]
    except RuntimeError as e:
        errors.append(f"navigation: {e}")
    return out, errors


def download(url, dest):
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 16):
                f.write(chunk)


def fmt_time(ts):
    try:
        return datetime.fromisoformat(ts.replace("+0000", "+00:00")).astimezone().strftime("%d/%m %H:%M")
    except Exception:
        return ts or "?"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="./stories", help="pasta de saída")
    ap.add_argument("--json-in", help="reprocessa um stories.json existente em vez de chamar a API")
    ap.add_argument("--no-media", action="store_true", help="não baixa a mídia")
    ap.add_argument("--no-insights", action="store_true", help="não puxa insights")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.json_in:
        stories = json.loads(Path(args.json_in).read_text())
        if isinstance(stories, dict):
            stories = stories.get("stories", stories.get("data", []))
        token = os.environ.get("IG_ACCESS_TOKEN")
    else:
        token = os.environ.get("IG_ACCESS_TOKEN")
        if not token:
            sys.exit("IG_ACCESS_TOKEN não definido. Sem token não há como consultar a API; "
                     "peça os prints dos stories ou use o Windsor.")
        ig_user_id = os.environ.get("IG_USER_ID") or discover_ig_user(token)
        stories = fetch_stories(token, ig_user_id)
        if not stories:
            print("Nenhum story ativo nas últimas 24h para esta conta.")
            (out / "stories.json").write_text("[]")
            return

    for i, s in enumerate(stories, 1):
        s["ordem"] = i
        if token and not args.no_insights and "insights" not in s:
            s["insights"], s["insights_erros"] = fetch_insights(token, s["id"])
        if not args.no_media and "arquivo" not in s:
            url = s.get("media_url") or s.get("thumbnail_url")
            if url:
                ext = ".mp4" if s.get("media_type") == "VIDEO" and s.get("media_url") else ".jpg"
                dest = out / f"{i:02d}_{s['id']}{ext}"
                try:
                    download(url, dest)
                    s["arquivo"] = str(dest)
                except Exception as e:
                    s["arquivo_erro"] = str(e)

    (out / "stories.json").write_text(json.dumps(stories, ensure_ascii=False, indent=2))

    print(f"{len(stories)} stories -> {out / 'stories.json'}\n")
    print(f"{'#':>2}  {'hora':<12} {'tipo':<8} {'views':>6} {'reach':>6} {'resp':>5} {'arquivo'}")
    for s in stories:
        ins = s.get("insights", {}) or {}
        print(f"{s['ordem']:>2}  {fmt_time(s.get('timestamp')):<12} {s.get('media_type', '?'):<8} "
              f"{str(ins.get('views', '-')):>6} {str(ins.get('reach', '-')):>6} {str(ins.get('replies', '-')):>5} "
              f"{s.get('arquivo', s.get('arquivo_erro', ''))}")
        if s.get("caption"):
            print(f"      legenda: {s['caption'][:120]}")
        if s.get("insights_erros"):
            print(f"      insights indisponíveis: {'; '.join(s['insights_erros'])[:160]}")


if __name__ == "__main__":
    main()
