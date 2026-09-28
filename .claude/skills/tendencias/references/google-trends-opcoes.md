# Google Trends — opções de acesso (pesquisa de 27/09/2026)

Resumo de 2 buscas paralelas (~120 fontes revisadas) + testes locais.

| Opção | Funciona? | Buscas em alta (rising) | Estado/cidade | Custo | Observação |
|---|---|---|---|---|---|
| Script local (`google_trends.py`) | ✅ medido | ✅ | ✅ cidade | grátis | trava após ~25 consultas/40 min por conexão |
| Navegador da pessoa | ✅ medido — **melhor opção grátis** | ✅ | ✅ cidade | grátis | 9/9 consultas com o script bloqueado; manter a aba visível (screenshot) senão parece bloqueio |
| BigQuery `google_trends.international_top_rising_terms` | ✅ medido (dados até ontem) | só top 25 geral | ✅ estado | grátis (cota do BigQuery) | só assuntos gerais do país/estado (futebol, clima) — **não pesquisa termo do nicho**; serve para "estourou no estado?" |
| RSS "em alta hoje" | ✅ medido | top do dia | país | grátis | geral, não por nicho |
| API oficial do Google Trends | ⏳ alfa desde jul/2025, acesso só por inscrição | não documentado | estado (ISO 3166-2) | sem preço | não contar com ela — https://developers.google.com/search/blog/2025/07/trends-api |
| SerpApi | ✅ (vendor) | ✅ com % | ✅ até cidade | US$ 25–275/mês (1k–30k consultas) | https://serpapi.com/google-trends-api |
| DataForSEO Trends | ✅ (vendor) | tópicos; consultas não documentado | ✅ | ~US$ 0,0012–0,00225 por tarefa, mín. US$ 50 | https://dataforseo.com/apis/dataforseo-trends-api |
| pytrends | ❌ arquivado em abr/2025 | — | — | — | substitutos da comunidade: trendspyg, pytrends-modern (mesmo limite de cota) |

Boas práticas relatadas (praticantes): 3–5 s entre consultas, até 5 termos comparados numa mesma consulta, backoff exponencial depois de erro (60 s ou mais), renovar o token por lote. Nenhuma delas elimina o limite por conexão — só adia.
Fontes: https://dev.to/votiakov/google-trends-will-429-you-into-the-ground-heres-how-i-got-past-it-50hk · https://scrapebadger.com/blog/does-google-trends-have-an-api-what-to-use-in-2026 · https://support.google.com/trends/answer/12764470?hl=en

Custo estimado com SerpApi numa pesquisa da skill (~8 consultas): ~US$ 0,20 no plano de US$ 25 (conta, não medido).
