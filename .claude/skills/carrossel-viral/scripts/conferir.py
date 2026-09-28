#!/usr/bin/env python3
"""Confere o carrossel.json contra as regras de tamanho (carousel-writer-sms + Instagram).

Uso: python3 conferir.py caminho/carrossel.json
Sai com código 1 se alguma regra quebrar, e diz qual.
"""
import json
import sys

LIMITES = {
    "slides_min": 8, "slides_max": 10,        # Instagram: 8-10 é o ponto ideal, 10 é o teto comum
    "titulo_max": 8,                          # "Bold header — 8 words or fewer"
    "texto_max": 30,                          # "max 30 words per slide body"
    "contexto_frases_max": 2,                 # slide 2: "One to two short sentences"
    "legenda_gancho_max": 125,                # corte do "...mais" no Instagram
}


def palavras(t):
    # emoji e seta não contam como palavra
    return len([p for p in (t or "").split() if any(c.isalnum() for c in p)])


def frases(t):
    t = (t or "").replace("?", ".").replace("!", ".").replace("→", ".")
    return len([f for f in t.split(".") if palavras(f) > 0])


def main(caminho):
    d = json.load(open(caminho, encoding="utf-8"))
    erros, linhas = [], []
    slides = d.get("slides", [])
    n = len(slides)
    if not LIMITES["slides_min"] <= n <= LIMITES["slides_max"]:
        erros.append(f"{n} slides — o ideal no Instagram é de 8 a 10")

    for s in slides:
        papel = s.get("papel", "")
        pt, px = palavras(s.get("titulo")), palavras(s.get("texto"))
        linhas.append(f"slide {s.get('n')} ({papel}): título {pt} · texto {px}")
        if papel == "cta":
            pass  # título do CTA é a frase-resumo; sem limite de 8
        elif pt > LIMITES["titulo_max"]:
            erros.append(f"slide {s.get('n')}: título com {pt} palavras (máx. 8)")
        if px > LIMITES["texto_max"]:
            erros.append(f"slide {s.get('n')}: texto com {px} palavras (máx. 30)")
        if papel == "contexto" and frases(s.get("texto")) > LIMITES["contexto_frases_max"]:
            erros.append(f"slide {s.get('n')}: contexto com mais de 2 frases")

    papeis = [s.get("papel") for s in slides]
    if papeis[:1] != ["capa"] or papeis[-1:] != ["cta"]:
        erros.append("o primeiro slide precisa ser a capa e o último o CTA")

    capas = d.get("capas", [])
    for c in capas:
        pc = palavras(c.get("titulo"))
        if pc > LIMITES["titulo_max"]:
            erros.append(f"capa '{c.get('padrao')}': título com {pc} palavras (máx. 8)")
    rec = [c for c in capas if c.get("recomendada")]
    if len(rec) != 1:
        erros.append("marque exatamente 1 capa como recomendada")
    elif slides and rec[0].get("titulo", "").strip() != (slides[0].get("titulo") or "").strip():
        erros.append("o título do slide 1 não é o da capa recomendada")

    leg = d.get("legenda", "")
    l1 = leg.strip().split("\n")[0] if leg else ""
    linhas.append(f"legenda, 1ª linha: {len(l1)} caracteres")
    if len(l1) > LIMITES["legenda_gancho_max"]:
        erros.append(f"1ª linha da legenda com {len(l1)} caracteres (máx. 125 antes do '...mais')")

    for c in d.get("checagem", []):
        if c.get("status") not in ("confirmado", "ajustado", "removido"):
            erros.append(f"checagem sem status válido: {c.get('afirmacao')}")

    print("\n".join(linhas))
    if erros:
        print("\nREPROVADO:")
        print("\n".join(f"- {e}" for e in erros))
        sys.exit(1)
    print("\nAPROVADO: todos os limites respeitados.")


if __name__ == "__main__":
    main(sys.argv[1])
