// Worker (kindo-site.*.workers.dev): robots.txt e sitemap.xml dinâmicos;
// todo o resto é servido direto da pasta public/.
import { respostaSeo } from "./seo.js";

export default {
  async fetch(request, env) {
    return respostaSeo(new URL(request.url)) ?? env.ASSETS.fetch(request);
  },
};
