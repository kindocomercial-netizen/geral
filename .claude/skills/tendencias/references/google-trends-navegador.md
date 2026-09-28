# Google Trends pelo navegador da pessoa (caminho principal)

Medido em 27/09/2026: com o script (`google_trends.py`) bloqueado pelo Google, o Chrome da pessoa (extensão Claude in Chrome) fez **9 consultas seguidas, 9 completas** (curva, cidades/estados e buscas em alta). O navegador real, com cookies e login, não cai no mesmo bloqueio do script.

## A armadilha que parece bloqueio (e não é)

O Chrome **congela abas em segundo plano**: os gráficos do Trends ficam com o círculo girando para sempre e a leitura volta vazia. Isso parece bloqueio do Google, mas é só a aba escondida. Foi descoberto porque as consultas que funcionavam eram justamente as que tinham um print de tela no meio — o print traz a aba para frente.

**Regra:** entre abrir a página e ler, sempre faça um screenshot (pode ser minúsculo, escala 0.1) depois de rolar. Isso mantém a aba visível e força os gráficos a carregarem.

## Receita (um bloco do browser_batch por termo)

1. `navigate` → `https://trends.google.com/trends/explore?date=<periodo>&geo=<geo>&q=<termo>&hl=pt-BR`
   - `periodo`: `now%207-d` (semana), `today%201-m` (mês), `today%203-m` (90 dias)
   - `geo`: `BR`, ou estado `BR-RJ`, `BR-SP`, `BR-MG`...
   - `termo`: codificado (espaço `%20`, ç `%C3%A7`, ã `%C3%A3`)
2. `computer wait` 6 s
3. `computer scroll` para baixo, 15 cliques
4. `computer wait` 5 s
5. `computer screenshot` com `scale: 0.1` (obrigatório — ver armadilha acima)
6. `javascript_tool` com o leitor:

```js
const s = document.body.innerText.replace(/https?:\S+/g,'').split('\n').map(x=>x.trim())
  .filter(x => x && !/more_vert|help_outline|file_download|^code$|^share$/.test(x));
const j = s.findIndex(x=>/^x\ty1$/.test(x));
const i = s.findIndex(x=>/^Interesses? por/.test(x));   // "Interesse por sub-região" (país) ou "Interesses por cidade" (estado)
const p = s.findIndex(x=>/^Pesquisas relacionadas$/.test(x));
({ ok: i > 0,
   // semana (now 7-d) vem por HORA: resuma pelo máximo de cada dia; mês/90 dias vêm por dia
   curva: (()=>{const pts=s.slice(j+1,i).map(x=>x.split('\t')).filter(x=>x.length==2); if(pts.length<=31) return pts.map(x=>x.join('=')).join(' | '); const dia={}; pts.forEach(([t,v])=>{const d=t.split(' às ')[0].split(',')[0]; dia[d]=Math.max(dia[d]||0,+v)}); return Object.entries(dia).map(x=>x.join('=')).join(' | ')})(),
   lugares: s.slice(i+2, i+20).join(' '),  // pega os 5 lugares mesmo com a linha "Incluir regiões com baixo volume"
   emAlta: s.slice(p+2, p+17).join(' '),
   // a lista pode estar em "Principais" (TOP: notas 100, 59...) em vez de "Em ascensão" (+N% / Aumento repentino)
   listaEhEmAlta: /Aumento repentino|\+\s?\d|Mais \d/.test(s.slice(p+2, p+17).join(' ')) })
```

Dá para encadear vários termos num único `browser_batch` (medido: 3 termos por lote, sem falha).

Se `listaEhEmAlta` vier `false`, a página está mostrando a lista **Principais** (TOP), não a **Em ascensão**: os números são notas de 0–100, não crescimento. Não use como prova de procura subindo. Troque o seletor da lista de "Principais" para "Em ascensão" (clique no menu acima da lista) e leia de novo; se não conseguir, marque Procura como ◐ e diga que o crescimento não foi medido.

Se `ok` vier `false`, tire um screenshot maior para ver o estado; se os quadros ainda estiverem girando, espere mais 10 s e leia de novo.

## Cuidados

- **Não use `fetch` na API interna do Trends pela extensão**: o Claude in Chrome bloqueia a resposta ("BLOCKED: Cookie/query string data"). Leia o texto da página.
- Cada lista mostra só **5 itens**. Para mais, clique na seta ">" da lista e leia de novo — os 5 primeiros costumam bastar.
- Abra uma aba própria e feche no fim.
- Leitura dos números: mesmas regras do SKILL.md (proporção, não volume; degraus redondos = pouco volume).
