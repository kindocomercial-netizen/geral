#!/usr/bin/env python3
"""Teste do motor: carrossel.json -> PNGs 1080x1350 (HTML + Playwright)."""
import colorsys, html, json, sys, pathlib, asyncio
from playwright.async_api import async_playwright

W, H, ESC = 1080, 1350, 1  # desenha direto em 1080

def hex2rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))
def rgb2hex(r, g, b): return "#%02x%02x%02x" % tuple(round(max(0, min(1, x))*255) for x in (r, g, b))

def lum(h):
    c = [x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4 for x in hex2rgb(h)]
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def contraste(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

TEMAS = {"neutro": "#2F5DA8", "quente": "#C8553D", "verde": "#2A7F62", "rosa": "#D9738A", "mono": "#555555"}

def paleta(cor):
    """1 cor da marca -> 6 tons (ideia marcolang, fórmula própria em HLS)."""
    h, l, s = colorsys.rgb_to_hls(*hex2rgb(cor))
    t = lambda L, S=s: rgb2hex(*colorsys.hls_to_rgb(h, L, min(1, S)))
    if l > 0.7:  # marca pastel: vira o fundo dos slides claros; a prova ganha um tom mais forte da mesma cor
        return {"acento": t(0.45, max(s, 0.5)), "claro": cor, "claro2": t(0.85, s),
                "escuro": t(0.14, max(s, 0.3)*0.6), "tinta": t(0.15, s*0.3), "suave": t(0.32, s*0.25)}
    return {"acento": cor, "claro": t(0.96, s*0.5), "claro2": t(0.90, s*0.6),
            "escuro": t(0.12, s*0.5), "tinta": t(0.15, s*0.3), "suave": t(0.32, s*0.25)}

FUNDO = {"capa": "escuro", "contexto": "claro", "corpo": "claro", "prova": "acento", "cta": "escuro"}

CURSIVA = None  # fonte manuscrita opcional p/ título da capa e do CTA (ex.: Caveat)
FOTOS = None  # pasta fotos/ ao lado do JSON; slide-NN usa fotos/NN.png se existir
def foto(i):
    f = FOTOS / f'{i:02d}.png' if FOTOS else None
    return f'<div class="foto" style="background-image:url({f.as_uri()})"></div>' if f and f.exists() else ''

def ritmo(slides):
    """Fundo de cada slide: capa, prova e CTA pelo papel; os do meio ALTERNAM claro e escuro
    pela posição (ritmo do BrandsDecoded), e nunca repetem o fundo do vizinho anterior."""
    fs = []
    for k, s in enumerate(slides):
        f = FUNDO.get(s["papel"], "claro")
        if s["papel"] not in ("capa", "prova", "cta"):
            f = "claro" if k % 2 else "escuro"
            if fs and fs[-1].rstrip("2") == f:  # claro2 (capa clara) conta como claro
                f = "escuro" if f == "claro" else "claro"
        fs.append(f)
    return fs

RITMO = []

def slide_html(s, i, n, p, perfil, fonte_t, fonte_c):
    fundo = RITMO[i-1] if RITMO else FUNDO.get(s["papel"], "claro")
    bg = p[fundo]
    # tinta: a que der mais contraste com o fundo (cor da marca pode ser clara ou escura)
    ink = max(("#ffffff", p["tinta"]), key=lambda c: contraste(c, bg))
    esc = ink == "#ffffff"
    sub = "rgba(255,255,255,.78)" if esc else p["suave"]
    if not esc and contraste(p["suave"], bg) < 4.5:
        sub = ink  # tom suave some no fundo da marca (medido 2,5:1 no laranja); usa a tinta cheia
    curs = CURSIVA and s["papel"] in ("capa", "cta")
    cls = "cursiva" if curs else ""
    tam_t = {"capa": 136 if curs else 104, "cta": 104 if curs else 72}.get(s["papel"], 76)
    titulo = html.escape(s.get("titulo") or "")
    texto = html.escape(s.get("texto") or "")
    seta = f'<div class="seta" style="visibility:{"visible" if i < n else "hidden"}">arrasta →</div>'
    prog = f'<div class="prog"><div style="width:{i/n*100:.1f}%"></div></div>'
    return f"""<section class="s" style="background:{bg};color:{ink}">
  <div class="topo"><span>@{html.escape(perfil)}</span><span>{i:02d}/{n:02d}</span></div>
  {foto(i)}
  <div class="miolo {s['papel']}">
    {f'<h1 class="{cls}" style="font-size:{tam_t}px">{titulo}</h1>' if titulo else ''}
    {f'<p style="color:{sub if titulo else ink}">{texto}</p>' if texto else ''}
  </div>
  <div class="rodape">{prog}{seta}</div>
</section>"""

def pagina(d, cor, fonte_t, fonte_c):
    p = paleta(cor)
    n = len(d["slides"])
    global RITMO; RITMO = ritmo(d["slides"])
    corpo = "\n".join(slide_html(s, i, n, p, d.get("perfil", ""), fonte_t, fonte_c) for i, s in enumerate(d["slides"], 1))
    ft, fc = fonte_t.replace(" ", "+"), fonte_c.replace(" ", "+")
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family={ft}:wght@300;500;700&family={fc}:wght@400;600{'&family=' + CURSIVA.replace(' ', '+') + ':wght@500' if CURSIVA else ''}&display=block" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#222}}
.s{{width:{W}px;height:{H}px;padding:84px 88px 72px;display:flex;flex-direction:column;overflow:hidden;font-family:'{fonte_c}',sans-serif}}
.topo{{display:flex;justify-content:space-between;font-size:26px;font-weight:600;letter-spacing:.04em;opacity:.7}}
.miolo{{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px;min-height:0}}
.miolo.capa{{justify-content:flex-end;padding-bottom:40px}}
h1,p{{text-wrap:balance}}
h1{{font-family:'{fonte_t}',serif;font-weight:500;line-height:1.05;letter-spacing:-.01em}}
p{{font-size:40px;line-height:1.35}}
.contexto p{{font-size:48px;line-height:1.3}}
.rodape{{display:flex;align-items:center;gap:32px;font-size:26px;font-weight:600}}
.prog{{flex:1;height:6px;background:rgba(127,127,127,.25);border-radius:3px}}
.prog div{{height:100%;background:currentColor;border-radius:3px}}
.seta{{opacity:.8}}
.cursiva{{font-family:'{CURSIVA}',cursive;line-height:.95}}
.foto{{margin-top:36px;height:540px;border-radius:28px;background-size:cover;background-position:center;flex-shrink:0}}
.foto~.miolo{{justify-content:center;padding-bottom:0}}
</style></head><body>{corpo}</body></html>"""

async def main(json_path, cor, fonte_t="Fraunces", fonte_c="Inter", cursiva=None, pontas=None):
    global CURSIVA; CURSIVA = cursiva if cursiva not in (None, "", "-") else None
    if pontas == "claro": FUNDO["capa"] = FUNDO["cta"] = "claro2"
    cor = TEMAS.get(cor, cor)
    d = json.load(open(json_path, encoding="utf-8"))
    global FOTOS; FOTOS = pathlib.Path(json_path).resolve().parent / "fotos"
    p = paleta(cor)
    baixo = [f"{f}: {contraste(max(('#ffffff', p['tinta']), key=lambda c: contraste(c, p[f])), p[f]):.1f}"
             for f in set(FUNDO.values()) if max(contraste('#ffffff', p[f]), contraste(p['tinta'], p[f])) < 4.5]
    out = pathlib.Path(json_path).parent / "design"
    if out.exists():  # não apaga versão anterior: guarda com data
        import datetime
        out.rename(out.with_name("design-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")))
    out.mkdir()
    (out / "carrossel.html").write_text(pagina(d, cor, fonte_t, fonte_c), encoding="utf-8")
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": W, "height": H})
        await pg.goto((out / "carrossel.html").resolve().as_uri())
        await pg.evaluate("document.fonts.ready")
        problemas = await pg.evaluate("""() => [...document.querySelectorAll('.s')].map((s,i)=>{
          const m=s.querySelector('.miolo'); const r=[];
          if(m.scrollHeight>m.clientHeight+1) r.push('texto estoura a área');
          s.querySelectorAll('p').forEach(p=>{if(parseFloat(getComputedStyle(p).fontSize)<28) r.push('fonte < 28px')});
          return r.length? `slide ${i+1}: `+r.join(', '):null}).filter(Boolean)""")
        for i, el in enumerate(await pg.query_selector_all(".s"), 1):
            await el.screenshot(path=str(out / f"slide-{i:02d}.png"))
        await b.close()
    # prévia do feed: cada slide a 360px de largura (inspeção em tamanho de celular)
    from PIL import Image
    pngs = sorted(out.glob("slide-*.png"))
    th = [Image.open(x).resize((360, 450)) for x in pngs]
    folha = Image.new("RGB", (360*len(th) + 20*(len(th)-1), 450), "white")
    for k, im in enumerate(th): folha.paste(im, (k*380, 0))
    folha.save(out / "previa-feed-360px.png")
    # variedade medida no PIXEL: cor média de cada slide; 3 seguidos quase iguais = série monótona
    medias = [Image.open(x).convert("RGB").resize((1, 1)).getpixel((0, 0)) for x in pngs]
    perto = lambda a, b: sum(abs(u - v) for u, v in zip(a, b)) < 60
    seguidos, pior = 1, 1
    for k in range(1, len(medias)):
        seguidos = seguidos + 1 if perto(medias[k], medias[k-1]) else 1
        pior = max(pior, seguidos)
    if pior >= 3:
        problemas.append(f"série monótona: {pior} slides seguidos com o fundo quase igual")
    if baixo:
        problemas.append("contraste abaixo de 4.5:1 no fundo " + ", ".join(baixo) + " — escureça a cor da marca")
    print("REPROVADO:\n" + "\n".join(problemas) if problemas else f"APROVADO: sem estouro, fontes >= 28px, contraste >= 4.5:1, no máximo {pior} fundos iguais seguidos")
    print(out)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("uso: render.py carrossel.json <#cor-da-marca | " + " | ".join(TEMAS) + "> [fonte-titulo] [fonte-corpo] [fonte-cursiva|-] [claro]")
    asyncio.run(main(*sys.argv[1:]))
    
