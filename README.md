# Site institucional · Kindo Cosméticos

Site estático (HTML + CSS) hospedado na Cloudflare, com página inicial e catálogo de produtos.

```
catalogo/produtos.json   ← lista de produtos e categorias (edite aqui)
scripts/gerar-site.mjs   gera as páginas a partir da lista
public/                  ← tudo que vai pro ar
  index.html             página inicial (gerada)
  produtos/index.html    catálogo com busca (gerado)
  styles.css             visual (cores rosa #E5007E / ameixa #9A3D80)
  404.html               página de "não encontrada"
  _headers               cabeçalhos de segurança e cache
  assets/loja/           fotos da loja
  assets/produtos/       fotos dos produtos, nomeadas pelo EAN (ex.: 7891010099725.webp)
src/seo.js               gera robots.txt e sitemap.xml com o domínio do site
src/index.js             Worker antigo: redireciona kindo-site.*.workers.dev para o Pages
functions/_middleware.js site oficial no Cloudflare Pages (kindocosmeticos.pages.dev)
wrangler.jsonc           configuração da Cloudflare
```

## Dados da loja

Endereço, horário, nota do Google, ano de abertura etc. ficam no topo de
`scripts/gerar-site.mjs` (conferidos no Perfil da Empresa no Google em out/2026).
Mudou algo? Edite lá e rode `node scripts/gerar-site.mjs`.

## Adicionar ou mudar produtos

1. Coloque a foto em `public/assets/produtos/<EAN>.webp` (quadrada, fundo branco, ~480 px).
2. Acrescente o item em `catalogo/produtos.json` (ean, nome, marca, categoria).
3. Rode `node scripts/gerar-site.mjs` e faça o commit.

Dica de SEO: escreva o nome do produto do jeito que as pessoas procuram no Google
(tipo + marca + linha + tamanho), ex.: "Cera depilatória quente Depilart Rosa 250 g".

## Rodízio de destaques

A página inicial mostra 8 produtos e troca o grupo sozinha a cada 10 dias
(constantes `POR_GRUPO`, `DIAS_POR_GRUPO` e `INICIO_RODIZIO` em `scripts/gerar-site.mjs`).
Os grupos misturam categorias; produtos novos no `catalogo/produtos.json` entram no rodízio
quando o site é gerado de novo.

## SEO já configurado

- Título e descrição com "perfumaria", "cosméticos", "Lapa", "São Paulo".
- Dados estruturados (schema.org): loja local (`HealthAndBeautyBusiness`), perguntas
  frequentes (`FAQPage`) e catálogo (`ItemList` de `Product` com marca e EAN/GTIN).
- Texto alternativo em todas as fotos, URL canônica, `robots.txt` e `sitemap.xml` automáticos.

Depois de publicar, para aparecer no Google:
1. Cadastre o site no **Google Search Console** e envie `https://<seu-dominio>/sitemap.xml`.
2. No **Perfil da Empresa no Google** (Google Maps), coloque o link do site.
3. Coloque o link do site na bio do Instagram.

## Ver no computador

```bash
npx wrangler dev          # abre em http://localhost:8787
```

## Publicar na Cloudflare

### Opção A — pelo painel, ligado ao GitHub (recomendado)
1. Entre em https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository**.
2. Escolha o repositório `kindocomercial-netizen/geral` e a branch principal.
3. Build command: deixe vazio. Deploy command: `npx wrangler deploy`.
4. Salve. A cada push na branch o site é atualizado sozinho.

### Opção B — pelo terminal
```bash
npx wrangler login
npx wrangler deploy
```

Site oficial: https://kindocosmeticos.pages.dev (Cloudflare Pages, pasta `public`, publica sozinho a cada push na branch de produção).

### Domínio próprio (ex.: kindo.com.br)
Em **Workers & Pages → kindo-site → Settings → Domains & Routes → Add → Custom domain**.
O domínio precisa estar com o DNS na Cloudflare.

## Editar o conteúdo
Os textos ficam em `scripts/gerar-site.mjs`; não edite `public/index.html` direto, ele é gerado.
