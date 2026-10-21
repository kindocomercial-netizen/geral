# Site institucional · Kindo Cosméticos

Site de uma página (HTML + CSS, sem build) hospedado na Cloudflare.

```
public/          ← tudo que vai pro ar
  index.html     página principal
  styles.css     visual (cores rosa #E5007E / ameixa #9A3D80)
  404.html       página de "não encontrada"
  _headers       cabeçalhos de segurança e cache
  assets/        logo e favicon
wrangler.jsonc   configuração da Cloudflare
```

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

O site fica em `https://kindo-site.<sua-conta>.workers.dev`.

### Domínio próprio (ex.: kindo.com.br)
Em **Workers & Pages → kindo-site → Settings → Domains & Routes → Add → Custom domain**.
O domínio precisa estar com o DNS na Cloudflare.

## Editar o conteúdo
Textos, endereço, WhatsApp e Instagram ficam em `public/index.html`.
O horário de funcionamento está como "Consulte pelo WhatsApp". Troque pelo horário real.
