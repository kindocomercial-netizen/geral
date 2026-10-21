// robots.txt e sitemap.xml gerados com o domínio em que o site está sendo acessado.
// Usado pelo Worker (src/index.js) e pelo Cloudflare Pages (functions/_middleware.js).
const PAGINAS = ["/", "/produtos/"];

export function respostaSeo(url) {
  if (url.pathname === "/robots.txt") {
    return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${url.origin}/sitemap.xml\n`, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (url.pathname === "/sitemap.xml") {
    const hoje = new Date().toISOString().slice(0, 10);
    const urls = PAGINAS.map((p) => `  <url><loc>${url.origin}${p}</loc><lastmod>${hoje}</lastmod></url>`).join("\n");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }

  return null;
}
