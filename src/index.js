// Worker antigo (kindo-site.*.workers.dev): o site oficial agora é o Cloudflare Pages,
// então todo acesso aqui é redirecionado (301) para o mesmo caminho no endereço novo.
const SITE = "https://kindocosmeticos.pages.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(SITE + url.pathname + url.search, 301);
  },
};
