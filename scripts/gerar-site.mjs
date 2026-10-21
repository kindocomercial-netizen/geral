// Gera public/index.html e public/produtos/index.html a partir de catalogo/produtos.json.
// Uso: node scripts/gerar-site.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const raiz = new URL("..", import.meta.url).pathname;
const { categorias, produtos } = JSON.parse(readFileSync(raiz + "catalogo/produtos.json", "utf8"));

const ZAP = "5511913723597";
const ZAP_TXT = "(11) 91372-3597";
const INSTA = "https://www.instagram.com/kindoperfumaria/";
const ENDERECO = "Rua Doze de Outubro, 465";
const BAIRRO = "Lapa, São Paulo – SP";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const zap = (msg = "Olá, Kindo!") => `https://wa.me/${ZAP}?text=${encodeURIComponent(msg)}`;
const foto = (p) => `/assets/produtos/${p.ean}.webp`;
const temFoto = (p) => existsSync(`${raiz}public${foto(p)}`);
const catNome = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));

const loja = [
  ["corredor-da-loja", "Corredor da Kindo Cosméticos na Lapa"],
  ["tinturas-coloracao", "Prateleira de tinturas e coloração para cabelo"],
  ["cremes-para-pentear", "Cremes para pentear e finalizadores"],
  ["shampoos-e-condicionadores", "Shampoos e condicionadores"],
  ["tratamento-capilar", "Tratamento capilar e ampolas"],
  ["hidratantes-e-shampoos", "Hidratantes corporais e cuidados com o cabelo"],
  ["barba-e-masculino", "Produtos masculinos, tintura para barba e pomadas"],
  ["acessorios-de-beleza", "Acessórios de beleza: esponjas, toucas e escovas"],
  ["mascaras-capilares", "Máscaras capilares e cremes de tratamento"],
  ["oleos-e-finalizadores", "Óleos, sprays e finalizadores para cabelo"],
  ["tinturas-prateleira", "Tinturas das principais marcas"],
  ["esponjas-e-escovas", "Esponjas, pentes e acessórios para cabelo"],
];

const lojaSchema = {
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "@id": "/#loja",
  name: "Kindo Cosméticos",
  alternateName: ["Kindo Perfumaria", "Kindo Lapa"],
  description: "Perfumaria e loja de cosméticos na Lapa, em São Paulo: perfumes, tintura e produtos para cabelo, depilação, skincare, óleos essenciais e acessórios de beleza.",
  image: "/assets/loja/corredor-da-loja.webp",
  logo: "/assets/kindo-logo.png",
  telephone: "+55 11 91372-3597",
  priceRange: "$",
  address: {
    "@type": "PostalAddress",
    streetAddress: ENDERECO,
    addressLocality: "São Paulo",
    addressRegion: "SP",
    addressCountry: "BR",
  },
  areaServed: ["Lapa", "Vila Romana", "Vila Leopoldina", "Pompeia", "Perdizes", "São Paulo"],
  sameAs: [INSTA],
};

function cabeca({ titulo, descricao, caminho, schemas }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descricao)}">
  <meta name="theme-color" content="#E5007E">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="geo.region" content="BR-SP">
  <meta name="geo.placename" content="Lapa, São Paulo">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${caminho}" data-canonico>

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Kindo Cosméticos">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:image" content="/assets/loja/corredor-da-loja.webp">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Gilda+Display&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
${schemas.map((s) => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
</head>
<body>
  <header class="topo">
    <div class="wrap topo__in">
      <a href="/" class="topo__logo" aria-label="Kindo Cosméticos, início">
        <img src="/assets/kindo-logo.png" alt="Kindo Cosméticos" width="362" height="147">
      </a>
      <nav class="topo__nav" aria-label="Principal">
        <a href="/#sobre">Sobre</a>
        <a href="/#loja">A loja</a>
        <a href="/produtos/">Produtos</a>
        <a href="/#visite">Visite</a>
      </nav>
      <a class="btn btn--zap btn--sm" href="${zap()}" target="_blank" rel="noopener">WhatsApp</a>
    </div>
  </header>
`;
}

const rodape = `
  <footer class="rodape">
    <div class="wrap rodape__in">
      <p>© <span id="ano">2026</span> Kindo Cosméticos · Perfumaria e cosméticos na Lapa · ${ENDERECO} – ${BAIRRO}</p>
      <p><a href="/produtos/">Produtos</a> · <a href="${INSTA}" target="_blank" rel="noopener">Instagram</a> · <a href="https://wa.me/${ZAP}" target="_blank" rel="noopener">WhatsApp</a></p>
    </div>
  </footer>

  <a class="zap-fixo" href="${zap()}" target="_blank" rel="noopener" aria-label="Falar com a Kindo no WhatsApp">
    <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6C28.7 8.6 23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.3 1.1 1.2-4.2-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.2 9.8 10 5 16 5s10.8 4.7 10.8 10.6S22 26.1 16 26.1zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>
  </a>

  <script>
    document.getElementById('ano').textContent = new Date().getFullYear();
    document.querySelectorAll('[data-canonico]').forEach(function (l) { l.href = location.origin + l.getAttribute('href'); });
  </script>
`;

function cardProduto(p) {
  return `<article class="prod" id="p-${p.ean}" data-busca="${esc((p.nome + " " + p.marca + " " + catNome[p.categoria]).toLowerCase())}">
            <img src="${foto(p)}" alt="${esc(p.nome)}" width="480" height="480" loading="lazy">
            <div class="prod__txt">
              <p class="prod__marca">${esc(p.marca)}</p>
              <h3>${esc(p.nome)}</h3>
              <a class="prod__zap" href="${zap(`Olá, Kindo! Vocês têm ${p.nome}?`)}" target="_blank" rel="noopener">Consultar no WhatsApp</a>
            </div>
          </article>`;
}

const comFoto = produtos.filter(temFoto);

// ---------- Página inicial ----------
const destaques = ["3454090003460", "7908458329205", "7896433201250", "7899706183116", "7897230305134", "7895339017200", "7891177022123", "7896858633834"]
  .map((e) => comFoto.find((p) => p.ean === e)).filter(Boolean);

const faq = [
  ["Onde fica a Kindo Cosméticos?", `Na ${ENDERECO}, no bairro da Lapa, Zona Oeste de São Paulo.`],
  ["A Kindo faz entrega?", "Sim. Você faz o pedido pelo WhatsApp (11) 91372-3597 e a gente entrega por motoboy."],
  ["O preço no WhatsApp é o mesmo da loja?", "É igualzinho. Comprando no balcão ou pelo WhatsApp, você paga o mesmo valor."],
  ["Vocês vendem tintura para cabelo?", "Sim, temos tinturas e coloração das principais marcas, inclusive tintura progressiva e tonalizantes para cabelo e barba."],
  ["Tem cera depilatória?", "Temos cera quente e fria, folhas prontas, papel para depilação e loções pré e pós-depilação de marcas como Depilart e Depil Bella."],
  ["Como fico sabendo das promoções?", "Siga @kindoperfumaria no Instagram. Toda semana tem oferta, incluindo a Segunda do Preço de Custo."],
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

const home = cabeca({
  titulo: "Kindo Cosméticos | Perfumaria e loja de cosméticos na Lapa, SP",
  descricao: "Perfumaria e loja de cosméticos na Lapa, São Paulo. Perfumes, tintura, produtos para cabelo, cera depilatória, skincare e óleos essenciais. Peça pelo WhatsApp e receba por motoboy.",
  caminho: "/",
  schemas: [lojaSchema, faqSchema],
}) + `
  <main id="inicio">
    <section class="hero">
      <div class="wrap hero__in">
        <div class="hero__txt">
          <p class="selo">Perfumaria · Lapa · São Paulo</p>
          <h1>Perfumaria e cosméticos na Lapa, do jeito que você gosta.</h1>
          <p class="hero__lead">Perfumes, tintura, cabelos, depilação, skincare e acessórios, com atendimento de quem conhece cada produto do balcão. Passa na loja ou chama no zap que a gente leva.</p>
          <div class="hero__cta">
            <a class="btn btn--zap" href="${zap()}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
            <a class="btn btn--ghost" href="/produtos/">Ver produtos</a>
          </div>
        </div>
        <div class="hero__foto">
          <img src="/assets/loja/corredor-da-loja.webp" alt="Interior da Kindo Cosméticos, perfumaria na Lapa" width="900" height="1200" fetchpriority="high">
        </div>
      </div>
    </section>

    <section id="sobre" class="secao">
      <div class="wrap sobre">
        <div>
          <h2>Uma perfumaria de bairro, do jeito que tem que ser</h2>
          <p>A Kindo fica na Lapa e é aquela loja onde você entra, pergunta, testa e sai com o produto certo. Sem pressa e sem empurrar o que você não precisa.</p>
          <p>São corredores inteiros de tintura, shampoo, creme para pentear, máscara capilar, cera depilatória, hidratante, perfume e acessórios. E a gente explica para que serve, como usar e qual combina com você.</p>
        </div>
        <ul class="difs">
          <li><strong>Atendimento pelo WhatsApp</strong><span>Tire dúvidas, peça indicação e feche o pedido sem sair de casa.</span></li>
          <li><strong>Entrega por motoboy</strong><span>Pediu no zap, a gente leva até você.</span></li>
          <li><strong>O preço é igualzinho</strong><span>Na loja ou no WhatsApp, você paga o mesmo valor.</span></li>
          <li><strong>Ofertas toda semana</strong><span>Acompanhe no Instagram, incluindo a Segunda do Preço de Custo.</span></li>
        </ul>
      </div>
    </section>

    <section id="loja" class="secao secao--rosa">
      <div class="wrap">
        <h2>Conheça a loja</h2>
        <p class="secao__lead">Prateleiras cheias, organizadas por tipo de cuidado. Dá uma olhada no que te espera.</p>
        <div class="galeria">
${loja.map(([f, alt]) => `          <figure><img src="/assets/loja/${f}.webp" alt="${esc(alt)}" width="900" height="1200" loading="lazy"><figcaption>${esc(alt)}</figcaption></figure>`).join("\n")}
        </div>
      </div>
    </section>

    <section id="produtos" class="secao">
      <div class="wrap">
        <h2>O que você encontra na Kindo</h2>
        <div class="cats">
${categorias.map((c) => `          <a class="cat" href="/produtos/#${c.id}"><h3>${esc(c.nome)}</h3><p>${esc(c.descricao)}</p></a>`).join("\n")}
          <a class="cat" href="/#loja"><h3>Acessórios de beleza</h3><p>Esponjas, escovas, pentes, toucas, lixas e tudo para a rotina de beleza.</p></a>
        </div>

        <h2 class="mt">Alguns produtos da loja</h2>
        <div class="prods">
          ${destaques.map(cardProduto).join("\n          ")}
        </div>
        <p class="centro"><a class="btn btn--ghost" href="/produtos/">Ver o catálogo completo</a></p>
      </div>
    </section>

    <section id="duvidas" class="secao secao--rosa">
      <div class="wrap faq">
        <h2>Perguntas frequentes</h2>
${faq.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
      </div>
    </section>

    <section id="visite" class="secao">
      <div class="wrap visite">
        <div class="visite__info">
          <h2>Passa aqui na loja</h2>
          <dl>
            <dt>Endereço</dt>
            <dd>${ENDERECO}<br>${BAIRRO}</dd>
            <dt>WhatsApp</dt>
            <dd><a href="https://wa.me/${ZAP}" target="_blank" rel="noopener">${ZAP_TXT}</a></dd>
            <dt>Instagram</dt>
            <dd><a href="${INSTA}" target="_blank" rel="noopener">@kindoperfumaria</a></dd>
            <dt>Horário</dt>
            <dd>Consulte pelo WhatsApp</dd>
          </dl>
          <div class="hero__cta">
            <a class="btn btn--zap" href="${zap()}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
            <a class="btn btn--ghost" href="https://www.google.com/maps/search/?api=1&amp;query=Rua+Doze+de+Outubro,+465+Lapa+S%C3%A3o+Paulo" target="_blank" rel="noopener">Abrir no Maps</a>
          </div>
        </div>
        <div class="visite__mapa">
          <iframe title="Mapa: ${ENDERECO}, Lapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Rua+Doze+de+Outubro,+465,+Lapa,+S%C3%A3o+Paulo+-+SP&amp;output=embed"></iframe>
        </div>
      </div>
    </section>
  </main>
${rodape}</body>
</html>
`;

// ---------- Catálogo ----------
const catalogoSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Catálogo de produtos Kindo Cosméticos",
  numberOfItems: comFoto.length,
  itemListElement: comFoto.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: p.nome,
      brand: { "@type": "Brand", name: p.marca },
      gtin13: p.ean,
      sku: p.ean,
      category: catNome[p.categoria],
      image: foto(p),
      url: `/produtos/#p-${p.ean}`,
    },
  })),
};

const marcas = [...new Set(comFoto.map((p) => p.marca))].sort((a, b) => a.localeCompare(b, "pt-BR"));

const catalogo = cabeca({
  titulo: "Produtos | Kindo Cosméticos, perfumaria na Lapa SP",
  descricao: `Catálogo da Kindo Cosméticos na Lapa: ${marcas.slice(0, 10).join(", ")} e mais. Perfumes, cera depilatória, creme para pentear, protetor solar, óleos essenciais. Consulte pelo WhatsApp.`,
  caminho: "/produtos/",
  schemas: [lojaSchema, catalogoSchema],
}) + `
  <main>
    <section class="hero hero--curto">
      <div class="wrap">
        <p class="selo">Catálogo</p>
        <h1>Produtos da Kindo Cosméticos</h1>
        <p class="hero__lead">Uma amostra do que tem na loja da Lapa. Não achou o que procura? Chama no WhatsApp que a gente confere no estoque, porque tem muito mais no balcão.</p>
        <label class="busca">
          <span class="sr">Buscar produto</span>
          <input type="search" id="busca" placeholder="Buscar por produto ou marca (ex.: cera, Salon Line, lavanda)" autocomplete="off">
        </label>
        <nav class="chips" aria-label="Categorias">
${categorias.map((c) => `          <a href="#${c.id}">${esc(c.nome)}</a>`).join("\n")}
        </nav>
      </div>
    </section>

${categorias.map((c) => {
  const itens = comFoto.filter((p) => p.categoria === c.id);
  if (!itens.length) return "";
  return `    <section class="secao secao--cat" id="${c.id}">
      <div class="wrap">
        <h2>${esc(c.nome)}</h2>
        <p class="secao__lead">${esc(c.descricao)}</p>
        <div class="prods">
          ${itens.map(cardProduto).join("\n          ")}
        </div>
      </div>
    </section>`;
}).join("\n")}

    <section class="secao secao--rosa">
      <div class="wrap">
        <h2>Marcas que você encontra na Kindo</h2>
        <p class="marcas">${marcas.map(esc).join(" · ")}</p>
        <p class="sem-resultado" id="vazio" hidden>Não encontrou? <a href="${zap("Olá, Kindo! Vocês têm este produto: ")}" target="_blank" rel="noopener">Pergunte pelo WhatsApp</a> que a gente confere no estoque.</p>
      </div>
    </section>
  </main>
${rodape}
  <script>
    (function () {
      var campo = document.getElementById('busca');
      var vazio = document.getElementById('vazio');
      campo.addEventListener('input', function () {
        var t = campo.value.trim().toLowerCase();
        var algum = false;
        document.querySelectorAll('.secao--cat').forEach(function (s) {
          var visiveis = 0;
          s.querySelectorAll('.prod').forEach(function (p) {
            var ok = !t || p.dataset.busca.indexOf(t) !== -1;
            p.hidden = !ok;
            if (ok) visiveis++;
          });
          s.hidden = visiveis === 0;
          if (visiveis) algum = true;
        });
        vazio.hidden = algum;
      });
    })();
  </script>
</body>
</html>
`;

writeFileSync(raiz + "public/index.html", home);
mkdirSync(raiz + "public/produtos", { recursive: true });
writeFileSync(raiz + "public/produtos/index.html", catalogo);
console.log(`Gerado: index.html e produtos/index.html (${comFoto.length} produtos com foto, ${produtos.length - comFoto.length} sem foto).`);
