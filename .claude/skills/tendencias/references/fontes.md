# Catálogo de fontes

Tudo abaixo passa pelo Firecrawl. "Busca" significa achar pelo `firecrawl search` (título + trecho). "Abre" significa que o `firecrawl scrape` consegue ler a página inteira. Medido em 27/09/2026. Google Trends por termo, autocompletar e comentários rodam do computador do usuário, não pelo Firecrawl — se algo mudar, confie no que a ferramenta devolver na hora.

| Fonte | Como buscar | Busca | Abre | O que ela revela |
|---|---|---|---|---|
| Notícias locais | `--sources news --country BR` (ou país do público) | ✅ | ✅ | o que a imprensa está cobrindo |
| Notícias internacionais | `--sources news --country US` + busca em inglês | ✅ | ✅ | o que vai chegar aqui em semanas |
| Web geral / blogs | busca normal | ✅ | ✅ | artigos, guias, opinião de especialista |
| YouTube | `site:youtube.com <tema>` | ✅ | ✅ (página de resultados e vídeo) | formatos que funcionam + visualizações, idade e **estouro = views ÷ inscritos do canal** (`scripts/youtube_estouro.sh`; > 10 = estouro) |
| TikTok | `site:tiktok.com <tema>` | ✅ | ❌ | o que criadores estão postando, formatos curtos |
| Instagram | `site:instagram.com <tema>` | ✅ | ❌ | posts e reels do nicho |
| X (Twitter) | `site:x.com <tema>` | ✅ | ❌ | discussão rápida, polêmica do dia |
| Reddit | `site:reddit.com <tema em inglês>` | ✅ | ❌ | dúvidas reais, reclamações, debates |
| Hacker News | `site:news.ycombinator.com <tema>` | ✅ | ✅ | tecnologia/startups antes do mainstream |
| GitHub | `--categories github` | ✅ | ✅ | ferramentas novas ganhando tração (tech/IA/dev) |
| PDFs | `--categories pdf` | ✅ | ✅ | relatórios, pesquisas de mercado, dados oficiais |
| Pesquisa acadêmica | `--categories research` | ✅ | ✅ | estudos novos (saúde, ciência, nutrição, educação) |
| Imagens | `--sources images` | ✅ | — | estética visual em alta (moda, decoração, design, comida) |
| Google Trends (por termo) | `scripts/google_trends.py` — roda do computador do usuário (pelo Firecrawl dá erro 429) | ✅ | ✅ | curva 0–100, regiões (proporção), buscas relacionadas EM ALTA com % |
| Google autocompletar | `scripts/google_sugestoes.sh` | ✅ | ✅ | as dúvidas exatas que as pessoas digitam (sem volume) |
| Comentários do YouTube | `scripts/comentarios_youtube.sh` (precisa de yt-dlp; o Firecrawl não pega comentários) | ✅ | ✅ | sentimento, objeções, frases literais do público |
| Amazon mais vendidos | `firecrawl scrape https://www.amazon.com.br/gp/bestsellers` | ✅ | ✅ | produtos comprados no nicho (Mercado Livre falhou; Hotmart não tem ranking) |
| Google Trends (em alta hoje) | `curl` no RSS `trending/rss?geo=BR` | ✅ | ✅ | assunto que estourou no país inteiro (geral, não por nicho) |
| LinkedIn | `site:linkedin.com` | ⚠️ voltou vazio no teste | ❌ | — tente, mas não conte com ela |

Nas buscas `site:` de público local, sempre junte `--country <país>` — sem isso os resultados vêm misturados em outros idiomas.

Onde a fonte **não abre**, use o trecho da busca e marque *(não aberta)*.

## Escolha por tipo de nicho

**Sempre (qualquer nicho):** notícias locais, notícias internacionais, YouTube, TikTok, Instagram, Reddit.

Some a esse núcleo as fontes do perfil do nicho (um nicho pode ter mais de um perfil):

| Perfil do nicho | Exemplos | Fontes extras |
|---|---|---|
| Tecnologia, IA, programação, startups | IA, automação, SaaS, cripto | Hacker News, GitHub, X |
| Negócios, marketing, carreira, B2B | marketing digital, vendas, RH | X, PDFs (relatórios), LinkedIn (tentativa) |
| Saúde, nutrição, fitness, ciência, educação | emagrecimento, psicologia, pedagogia | Pesquisa acadêmica, PDFs |
| Visual e estética | moda, beleza, decoração, confeitaria, arquitetura | Imagens |
| Finanças e investimentos | finanças pessoais, investimentos | X, PDFs |
| Entretenimento, cultura, games, esporte | séries, games, futebol | X |
| Nicho local / serviço de bairro | clínica, restaurante, advocacia | notícias locais com cidade em `--location` |

Se o nicho não se encaixar em nenhum perfil, use só o núcleo. Diga no relatório quais fontes usou e por quê — a pessoa entende o que foi e o que não foi olhado.
