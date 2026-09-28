"""Junta uma página do app (HTML + CSS + JS locais) num único arquivo, para publicar como artifact.

Uso: python3 ferramentas/empacotar.py operador.html saida.html [dados.js ...]
Scripts extras (ex.: dados.js) entram antes dos scripts da página.
"""
import re, sys
from pathlib import Path

pagina, saida, *extras = sys.argv[1:]
base = Path(pagina).parent
html = Path(pagina).read_text(encoding='utf-8')
head = html[html.index('<head>') + 6:html.index('</head>')]
corpo = html[html.index('<body>') + 6:html.index('</body>')]

titulo = re.search(r'<title>.*?</title>', head).group(0)
fontes = '\n'.join(re.findall(r'<link[^>]+fonts\.g[^>]+>', head))
estilos = ''.join(f'<style>\n{(base / h).read_text(encoding="utf-8")}\n</style>\n'
                  for h in re.findall(r'<link rel="stylesheet" href="(?!http)([^"]+)">', head))
scripts = re.findall(r'<script src="([^"]+)"[^>]*></script>', corpo)
corpo = re.sub(r'\s*<script src="[^"]+"[^>]*></script>', '', corpo)
js = ''.join(f'<script>\n{Path(x).read_text(encoding="utf-8")}\n</script>\n' for x in extras)
js += ''.join(f'<script>\n{(base / s).read_text(encoding="utf-8")}\n</script>\n' for s in scripts if (base / s).exists())

Path(saida).write_text(f'{titulo}\n{fontes}\n{estilos}{corpo}\n{js}', encoding='utf-8')
print(f'{saida}: {len(Path(saida).read_bytes()) // 1024} KB')
