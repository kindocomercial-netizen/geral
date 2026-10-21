// Gera public/index.html e public/produtos/index.html a partir de catalogo/produtos.json.
// Uso: node scripts/gerar-site.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const raiz = new URL("..", import.meta.url).pathname;
const { categorias, produtos } = JSON.parse(readFileSync(raiz + "catalogo/produtos.json", "utf8"));

// Dados da loja (conferidos no Perfil da Empresa no Google)
const ZAP = "5511913723597";
const ZAP_TXT = "(11) 91372-3597";
const INSTA = "https://www.instagram.com/kindoperfumaria/";
const ENDERECO = "Rua Doze de Outubro, 465";
const BAIRRO = "Lapa, São Paulo – SP";
const CEP = "05073-000";
const DESDE = 2002;
const GOOGLE_NOTA = "4,5";
const GOOGLE_AVALIACOES = 152;
const GOOGLE_REVIEWS = "https://search.google.com/local/reviews?placeid=ChIJ2fYfm2P4zpQRSqNrYLAlT6k";
const MAPS = "https://www.google.com/maps/search/?api=1&query=Kindo+Cosm%C3%A9ticos&query_place_id=ChIJ2fYfm2P4zpQRSqNrYLAlT6k";
const GEO = { lat: -23.5220979, lng: -46.7050211 };
// [dia da semana (0 = domingo), abre, fecha]; dia ausente = fechado
const HORARIO = [[1, "08:30", "19:30"], [2, "08:30", "19:30"], [3, "08:30", "19:30"], [4, "08:30", "19:30"], [5, "08:30", "19:30"], [6, "08:30", "19:00"]];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const zap = (msg = "Olá, Kindo!") => `https://wa.me/${ZAP}?text=${encodeURIComponent(msg)}`;
const foto = (p) => `/assets/produtos/${p.ean}.webp`;
const temFoto = (p) => existsSync(`${raiz}public${foto(p)}`);
const catNome = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
const hora = (h) => h.replace(":00", "h").replace(":", "h");
const anos = new Date().getFullYear() - DESDE;

const ZAP_SVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6C28.7 8.6 23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.3 1.1 1.2-4.2-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.2 9.8 10 5 16 5s10.8 4.7 10.8 10.6S22 26.1 16 26.1zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>`;

const avaliacoes = [
  {
    nome: "Ana Paula Borges",
    quando: "Avaliação no Google",
    texto: "Fui retirar um pedido e fui muito bem atendida, desde a primeira atendente, com um sorriso contagiante até a moça que fica separando os pedidos. Foram muito gentis e educadas. […] Voltarei, pois a loja também é bem interessante, muito bem organizada e bons produtos.",
  },
  {
    nome: "Elaine Melissa",
    quando: "Avaliação no Google",
    texto: "Variedades e conta com um ponto de coleta da Shopee na unidade Lapa, que facilita o recebimento das compras.",
  },
];

const marcasDestaque = ["Salon Line", "Depilart", "Depil Bella", "Paris Elysees", "Fiorucci", "Neutrogena", "CeraVe", "Nivea", "WNF", "Ricosol", "Bozzano", "Nupill"];

const necessidades = [
  ["Vou pintar o cabelo", "Tintura, tonalizante e retoque de raiz. A gente ajuda a achar o tom certo.", "Olá, Kindo! Quero pintar o cabelo e preciso de ajuda para escolher a tintura."],
  ["Cachos e cabelos", "Creme para pentear, máscara, óleo e finalizador para cada tipo de fio.", "Olá, Kindo! Quero indicação de produtos para o meu cabelo."],
  ["Depilação em casa", "Cera quente ou fria, folhas prontas, papel e loções pré e pós.", "Olá, Kindo! Quero indicação de cera para depilar em casa."],
  ["Cuidar da pele", "Sabonete facial, protetor solar, esfoliante e hidratante.", "Olá, Kindo! Quero indicação de produtos para a minha pele."],
  ["Um perfume novo", "Femininos e masculinos para o dia a dia ou para marcar presença.", "Olá, Kindo! Estou procurando um perfume. O que vocês indicam?"],
  ["Presente", "A gente monta um kit caprichado dentro do seu orçamento.", "Olá, Kindo! Quero montar um presente. Meu orçamento é de R$ "],
];

const lojaSchema = {
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "@id": "/#loja",
  name: "Kindo Cosméticos",
  alternateName: ["Kindo Perfumaria", "Kindo Cosméticos Lapa"],
  description: `Perfumaria e loja de cosméticos na Lapa, em São Paulo, desde ${DESDE}. Tintura e produtos para cabelo, depilação, skincare, perfumes, óleos essenciais e acessórios de beleza. Pedidos pelo WhatsApp com entrega por motoboy no mesmo dia.`,
  image: ["/assets/loja/fachada-kindo-lapa.webp", "/assets/loja/og-kindo.jpg"],
  logo: "/assets/kindo-logo.png",
  telephone: "+55 11 91372-3597",
  priceRange: "$",
  foundingDate: String(DESDE),
  address: {
    "@type": "PostalAddress",
    streetAddress: ENDERECO,
    addressLocality: "São Paulo",
    addressRegion: "SP",
    postalCode: CEP,
    addressCountry: "BR",
  },
  geo: { "@type": "GeoCoordinates", latitude: GEO.lat, longitude: GEO.lng },
  hasMap: MAPS,
  openingHoursSpecification: HORARIO.map(([d, a, f]) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d],
    opens: a,
    closes: f,
  })),
  areaServed: ["Lapa", "Vila Romana", "Vila Leopoldina", "Pompeia", "Perdizes", "Água Branca", "São Paulo"],
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
  <meta name="theme-color" content="#9A3D80">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="geo.region" content="BR-SP">
  <meta name="geo.placename" content="Lapa, São Paulo">
  <meta name="geo.position" content="${GEO.lat};${GEO.lng}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${caminho}" data-canonico>

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Kindo Cosméticos">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:image" content="/assets/loja/og-kindo.jpg">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Gilda+Display&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
${schemas.map((s) => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
</head>
<body>
  <div class="aviso">
    <div class="wrap aviso__in">
      <span><span class="status" data-status>Na Lapa desde ${DESDE}</span></span>
      <span class="aviso__dir">Pediu no zap, chega <strong>no mesmo dia</strong> · <a href="${zap()}" target="_blank" rel="noopener">${ZAP_TXT}</a></span>
    </div>
  </div>
  <header class="topo">
    <div class="wrap topo__in">
      <a href="/" class="topo__logo" aria-label="Kindo Cosméticos, início">
        <img src="/assets/kindo-logo.png" alt="Kindo Cosméticos" width="362" height="147">
      </a>
      <nav class="topo__nav" aria-label="Principal">
        <a href="/#comprar">Como comprar</a>
        <a href="/produtos/">Produtos</a>
        <a href="/#historia">Nossa história</a>
        <a href="/#visite">Visite</a>
      </nav>
      <a class="btn btn--zap btn--sm" href="${zap()}" target="_blank" rel="noopener">${ZAP_SVG} WhatsApp</a>
    </div>
  </header>
`;
}

const rodape = `
  <footer class="rodape">
    <div class="wrap rodape__grid">
      <div>
        <img class="rodape__logo" src="/assets/kindo-logo.png" alt="Kindo Cosméticos" width="362" height="147" loading="lazy">
        <p>Perfumaria e cosméticos na Lapa desde ${DESDE}.</p>
      </div>
      <div>
        <h3>Endereço</h3>
        <p>${ENDERECO}<br>${BAIRRO}<br>CEP ${CEP}</p>
        <p><a href="${MAPS}" target="_blank" rel="noopener">Como chegar</a></p>
      </div>
      <div>
        <h3>Horário</h3>
        <p>Segunda a sexta: ${hora("08:30")} às ${hora("19:30")}<br>Sábado: ${hora("08:30")} às ${hora("19:00")}<br>Domingo: fechado<br>Pacotes Shopee: 10h às 18h</p>
      </div>
      <div>
        <h3>Fale com a gente</h3>
        <p><a href="https://wa.me/${ZAP}" target="_blank" rel="noopener">WhatsApp ${ZAP_TXT}</a><br><a href="${INSTA}" target="_blank" rel="noopener">Instagram @kindoperfumaria</a></p>
      </div>
    </div>
    <div class="wrap rodape__fim">© <span id="ano">${new Date().getFullYear()}</span> Kindo Cosméticos</div>
  </footer>

  <a class="zap-fixo" href="${zap()}" target="_blank" rel="noopener" aria-label="Falar com a Kindo no WhatsApp">${ZAP_SVG}</a>

  <script>
    document.getElementById('ano').textContent = new Date().getFullYear();
    document.querySelectorAll('[data-canonico]').forEach(function (l) { l.href = location.origin + l.getAttribute('href'); });
    (function () {
      var horario = ${JSON.stringify(HORARIO)};
      var agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      var min = agora.getHours() * 60 + agora.getMinutes();
      var m = function (h) { var p = h.split(':'); return +p[0] * 60 + +p[1]; };
      var f = function (h) { return h.replace(':00', 'h').replace(':', 'h'); };
      var hoje = horario.filter(function (h) { return h[0] === agora.getDay(); })[0];
      var txt, aberto = false;
      if (hoje && min >= m(hoje[1]) && min < m(hoje[2])) { aberto = true; txt = 'Aberto agora · fecha às ' + f(hoje[2]); }
      else if (hoje && min < m(hoje[1])) { txt = 'Fechado · abre hoje às ' + f(hoje[1]); }
      else {
        for (var i = 1; i <= 7; i++) {
          var d = (agora.getDay() + i) % 7;
          var p = horario.filter(function (h) { return h[0] === d; })[0];
          if (p) { txt = 'Fechado · abre ' + (i === 1 ? 'amanhã' : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d]) + ' às ' + f(p[1]); break; }
        }
      }
      document.querySelectorAll('[data-status]').forEach(function (el) {
        el.textContent = txt;
        el.classList.add(aberto ? 'status--aberto' : 'status--fechado');
      });
    })();
  </script>
`;

function cardProduto(p) {
  return `<article class="prod" id="p-${p.ean}" data-busca="${esc((p.nome + " " + p.marca + " " + catNome[p.categoria]).toLowerCase())}">
            <img src="${foto(p)}" alt="${esc(p.nome)}" width="480" height="480" loading="lazy">
            <div class="prod__txt">
              <p class="prod__marca">${esc(p.marca)}</p>
              <h3>${esc(p.nome)}</h3>
              <a class="prod__zap" href="${zap(`Olá, Kindo! Vocês têm ${p.nome}?`)}" target="_blank" rel="noopener">Consultar no WhatsApp →</a>
            </div>
          </article>`;
}

const comFoto = produtos.filter(temFoto);

// ---------- Página inicial ----------
// Destaques da página inicial: o catálogo é intercalado por categoria e dividido em grupos
// de 8; o navegador mostra um grupo diferente a cada 10 dias (sem precisar publicar de novo).
const POR_GRUPO = 8;
const DIAS_POR_GRUPO = 10;
const INICIO_RODIZIO = Math.floor(Date.UTC(2026, 9, 21) / 86400000); // 21/10/2026 = primeiro grupo
const porCategoria = categorias.map((c) => comFoto.filter((p) => p.categoria === c.id));
const intercalados = [];
for (let i = 0; porCategoria.some((l) => l[i]); i++) porCategoria.forEach((l) => l[i] && intercalados.push(l[i]));
const nGrupos = Math.ceil(intercalados.length / POR_GRUPO);
const grupos = Array.from({ length: nGrupos }, (_, g) => {
  const grupo = intercalados.slice(g * POR_GRUPO, (g + 1) * POR_GRUPO);
  // completa o último grupo com produtos do começo para ter sempre 8
  for (let i = 0; grupo.length < POR_GRUPO && i < intercalados.length; i++) if (!grupo.includes(intercalados[i])) grupo.push(intercalados[i]);
  return grupo;
});

const faq = [
  ["Onde fica a Kindo Cosméticos?", `Na ${ENDERECO}, na Lapa, Zona Oeste de São Paulo (CEP ${CEP}).`],
  ["Qual o horário de funcionamento?", "De segunda a sexta, das 8h30 às 19h30, e aos sábados, das 8h30 às 19h. Domingo a loja fica fechada."],
  ["A Kindo faz entrega?", `Sim. Você pede pelo WhatsApp ${ZAP_TXT} e o motoboy entrega no mesmo dia.`],
  ["O preço no WhatsApp é o mesmo da loja?", "É igualzinho. Comprando no balcão ou pelo WhatsApp, você paga o mesmo valor."],
  ["A Kindo é ponto de retirada da Shopee?", "Sim, a loja é ponto de coleta e retirada da Shopee. A retirada e a entrega de pacotes Shopee funcionam das 10h às 18h, horário diferente do da loja."],
  ["Vocês vendem tintura para cabelo?", "Sim, temos tinturas e coloração de várias marcas, além de tonalizantes e tintura progressiva para cabelo e barba."],
  ["Como fico sabendo das promoções?", "Siga @kindoperfumaria no Instagram. Toda semana tem oferta, incluindo a Segunda do Preço de Custo."],
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

const estrelas = `<span class="estrelas" aria-hidden="true">★★★★★</span>`;

const home = cabeca({
  titulo: "Kindo Cosméticos | Perfumaria na Lapa, São Paulo, desde 2002",
  descricao: `Perfumaria e loja de cosméticos na Rua Doze de Outubro, 465, Lapa (SP), desde ${DESDE}. Tintura, cabelos, depilação, skincare e perfumes. Peça pelo WhatsApp e receba no mesmo dia.`,
  caminho: "/",
  schemas: [lojaSchema, faqSchema],
}) + `
  <main id="inicio">
    <section class="hero">
      <div class="wrap hero__in">
        <div class="hero__txt">
          <p class="selo">Perfumaria de bairro · Lapa · desde ${DESDE}</p>
          <h1>Sua perfumaria de bairro na Lapa</h1>
          <p class="hero__lead">Há ${anos} anos na Rua Doze de Outubro com as melhores marcas, preço que cabe no bolso e atendimento de quem conhece cada produto do balcão.</p>
          <div class="hero__cta">
            <a class="btn btn--zap" href="${zap()}" target="_blank" rel="noopener">${ZAP_SVG} Chamar no WhatsApp</a>
            <a class="btn btn--ghost" href="${MAPS}" target="_blank" rel="noopener">Como chegar</a>
          </div>
          <a class="nota" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener">
            ${estrelas} <strong>${GOOGLE_NOTA}</strong> no Google · ${GOOGLE_AVALIACOES} avaliações
          </a>
        </div>
        <figure class="hero__foto">
          <img src="/assets/loja/fachada-kindo-lapa.webp" alt="Fachada da Kindo Cosméticos na Rua Doze de Outubro, 465, Lapa" width="1600" height="1200" fetchpriority="high">
          <figcaption>
            <strong>${ENDERECO}</strong>
            <span>${BAIRRO}</span>
            <span class="status" data-status></span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="numeros" aria-label="A Kindo em números">
      <div class="wrap numeros__in">
        <div><strong>${anos} anos</strong><span>na Lapa, desde ${DESDE}</span></div>
        <div><strong>${GOOGLE_NOTA} ★</strong><span>${GOOGLE_AVALIACOES} avaliações no Google</span></div>
        <div><strong>Mesmo dia</strong><span>entrega por motoboy</span></div>
        <div><strong>Mesmo preço</strong><span>na loja e no WhatsApp</span></div>
      </div>
    </section>

    <section id="comprar" class="secao">
      <div class="wrap">
        <p class="sobretitulo">Como comprar</p>
        <h2>Do jeito que for melhor pra você</h2>
        <div class="comprar">
          <div class="comprar__item">
            <span class="comprar__num">1</span>
            <h3>Na loja</h3>
            <p>Passa aqui, pergunta, testa e leva na hora. Segunda a sábado, a partir das 8h30.</p>
            <a href="${MAPS}" target="_blank" rel="noopener">Ver no mapa →</a>
          </div>
          <div class="comprar__item">
            <span class="comprar__num">2</span>
            <h3>Pelo WhatsApp</h3>
            <p>Manda o que você procura, a gente confere no estoque, tira dúvidas e indica o melhor produto.</p>
            <a href="${zap()}" target="_blank" rel="noopener">${ZAP_TXT} →</a>
          </div>
          <div class="comprar__item">
            <span class="comprar__num">3</span>
            <h3>Motoboy no mesmo dia</h3>
            <p>Fechou o pedido no zap? O motoboy leva até você no mesmo dia. Pelo mesmo preço da loja.</p>
            <a href="${zap("Olá, Kindo! Quero fazer um pedido para entrega.")}" target="_blank" rel="noopener">Fazer pedido →</a>
          </div>
        </div>
      </div>
    </section>

    <section class="marcas-faixa" aria-label="Marcas">
      <div class="wrap">
        <p class="sobretitulo">Marcas que você encontra aqui</p>
        <ul class="marcas-lista">
${marcasDestaque.map((m) => `          <li>${esc(m)}</li>`).join("\n")}
          <li class="marcas-mais"><a href="/produtos/">e muitas outras →</a></li>
        </ul>
      </div>
    </section>

    <section id="ajuda" class="secao secao--suave">
      <div class="wrap">
        <p class="sobretitulo">Do que você precisa hoje?</p>
        <h2>Conta pra gente que a gente indica</h2>
        <p class="secao__lead">Toque numa opção e a conversa no WhatsApp já abre com a sua pergunta.</p>
        <div class="precisa">
${necessidades.map(([t, d, msg]) => `          <a class="precisa__item" href="${zap(msg)}" target="_blank" rel="noopener"><h3>${esc(t)}</h3><p>${esc(d)}</p><span>Pedir indicação →</span></a>`).join("\n")}
        </div>
      </div>
    </section>

    <section id="produtos" class="secao">
      <div class="wrap">
        <div class="titulo-linha">
          <div>
            <p class="sobretitulo">Na prateleira</p>
            <h2>Alguns produtos da loja</h2>
          </div>
          <a class="btn btn--ghost btn--sm" href="/produtos/">Ver catálogo</a>
        </div>
${grupos.map((g, i) => `        <div class="prods" data-grupo="${i}"${i ? " hidden" : ""}>
          ${g.map(cardProduto).join("\n          ")}
        </div>`).join("\n")}
        <p class="nota-rodizio">Os destaques mudam a cada ${DIAS_POR_GRUPO} dias. Quer ver tudo? <a href="/produtos/">Abra o catálogo</a>.</p>
      </div>
    </section>
    <script>
      (function () {
        var grupos = document.querySelectorAll('[data-grupo]');
        var dia = Math.floor((Date.now() - 3 * 3600000) / 86400000);
        var atual = ((Math.floor((dia - ${INICIO_RODIZIO}) / ${DIAS_POR_GRUPO}) % grupos.length) + grupos.length) % grupos.length;
        grupos.forEach(function (g) { g.hidden = +g.dataset.grupo !== atual; });
      })();
    </script>

    <section id="historia" class="secao secao--suave">
      <div class="wrap historia">
        <img src="/assets/loja/corredor-acessorios.webp" alt="Corredor de acessórios de beleza da Kindo Cosméticos" width="1024" height="768" loading="lazy">
        <div>
          <p class="sobretitulo">Nossa história</p>
          <h2>Na Lapa desde ${DESDE}</h2>
          <p>A Kindo abriu as portas na Rua Doze de Outubro em ${DESDE} com uma ideia simples: ter as melhores marcas, tentando sempre agradar ao bolso de todos.</p>
          <p>De lá pra cá, a loja cresceu e ganhou corredores inteiros de tintura, cabelos, depilação, pele, perfumes e acessórios. O que não mudou foi o jeito de atender: com calma, explicando para que serve cada produto e indicando o que combina com você.</p>
          <p class="historia__assina">Equipe Kindo Cosméticos</p>
        </div>
      </div>
    </section>

    <section class="secao">
      <div class="wrap">
        <div class="titulo-linha">
          <div>
            <p class="sobretitulo">Quem compra, recomenda</p>
            <h2>${GOOGLE_NOTA} estrelas no Google</h2>
          </div>
          <a class="btn btn--ghost btn--sm" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener">Ver as ${GOOGLE_AVALIACOES} avaliações</a>
        </div>
        <div class="avaliacoes">
${avaliacoes.map((a) => `          <blockquote class="avaliacao">
            ${estrelas}
            <p>“${esc(a.texto)}”</p>
            <footer><strong>${esc(a.nome)}</strong> · ${esc(a.quando)}</footer>
          </blockquote>`).join("\n")}
          <div class="avaliacao avaliacao--cta">
            <p>Já comprou na Kindo? Sua avaliação ajuda outras pessoas do bairro a conhecer a loja.</p>
            <a class="btn btn--zap btn--sm" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener">Avaliar no Google</a>
          </div>
        </div>
      </div>
    </section>

    <section id="visite" class="secao secao--escuro">
      <div class="wrap visite">
        <div class="visite__info">
          <p class="sobretitulo">Visite a loja</p>
          <h2>Passa aqui, a gente te espera</h2>
          <dl>
            <dt>Endereço</dt>
            <dd>${ENDERECO}<br>${BAIRRO} · CEP ${CEP}</dd>
            <dt>Horário</dt>
            <dd>Segunda a sexta: 8h30 às 19h30<br>Sábado: 8h30 às 19h<br>Domingo: fechado<br><span class="status" data-status></span></dd>
            <dt>WhatsApp</dt>
            <dd><a href="https://wa.me/${ZAP}" target="_blank" rel="noopener">${ZAP_TXT}</a></dd>
            <dt>Shopee</dt>
            <dd>Ponto de coleta e retirada<br>Pacotes Shopee: <strong>das 10h às 18h</strong></dd>
          </dl>
          <div class="hero__cta">
            <a class="btn btn--zap" href="${zap()}" target="_blank" rel="noopener">${ZAP_SVG} Chamar no WhatsApp</a>
            <a class="btn btn--claro" href="${MAPS}" target="_blank" rel="noopener">Abrir no Google Maps</a>
          </div>
        </div>
        <div class="visite__mapa">
          <iframe title="Mapa: Kindo Cosméticos, ${ENDERECO}, Lapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Kindo+Cosm%C3%A9ticos,+Rua+Doze+de+Outubro,+465,+Lapa,+S%C3%A3o+Paulo&amp;output=embed"></iframe>
        </div>
      </div>
    </section>

    <section class="secao">
      <div class="wrap insta">
        <div>
          <p class="sobretitulo">Ofertas da semana</p>
          <h2>Segue a Kindo no Instagram</h2>
          <p class="secao__lead">Toda semana tem promoção, novidade e a Segunda do Preço de Custo. Quem segue fica sabendo primeiro.</p>
        </div>
        <a class="btn btn--ghost" href="${INSTA}" target="_blank" rel="noopener">@kindoperfumaria</a>
      </div>
    </section>

    <section id="duvidas" class="secao secao--suave">
      <div class="wrap faq">
        <p class="sobretitulo">Dúvidas</p>
        <h2>Perguntas frequentes</h2>
${faq.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
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
  descricao: `Catálogo da Kindo Cosméticos na Lapa: ${marcas.slice(0, 10).join(", ")} e mais. Cera depilatória, creme para pentear, protetor solar, perfumes e óleos essenciais. Consulte pelo WhatsApp e receba no mesmo dia.`,
  caminho: "/produtos/",
  schemas: [lojaSchema, catalogoSchema],
}) + `
  <main>
    <section class="hero hero--curto">
      <div class="wrap">
        <p class="selo">Catálogo</p>
        <h1>Produtos da Kindo Cosméticos</h1>
        <p class="hero__lead">Uma amostra do que tem na loja da Lapa. Não achou? Chama no WhatsApp que a gente confere no estoque, porque no balcão tem muito mais.</p>
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

    <section class="secao secao--suave">
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
