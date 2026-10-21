// Gera robots.txt e sitemap.xml com o domínio em que o site está sendo acessado;
// todo o resto é servido direto da pasta public/.
const PAGINAS = ["/", "/produtos/"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    return env.ASSETS.fetch(request);
  },
};
