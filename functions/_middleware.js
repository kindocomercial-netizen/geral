// Cloudflare Pages (kindocosmeticos.pages.dev): robots.txt e sitemap.xml dinâmicos;
// o resto segue para os arquivos estáticos de public/.
import { respostaSeo } from "../src/seo.js";

export async function onRequest({ request, next }) {
  return respostaSeo(new URL(request.url)) ?? next();
}
