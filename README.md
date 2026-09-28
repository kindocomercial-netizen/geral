# geral

Repositório geral da Kindo Perfumaria. Hoje guarda as skills de Claude Code usadas para pesquisa de tendências e produção de conteúdo para o Instagram.

## Skills (`.claude/skills/`)

O fluxo de conteúdo vai em três etapas encadeadas, mais uma skill independente de geração por IA:

| Skill | O que faz | Etapa |
|---|---|---|
| [`tendencias`](.claude/skills/tendencias/SKILL.md) | Pesquisa assuntos em alta em qualquer nicho cruzando Google Trends, YouTube, TikTok/Instagram, Reddit, imprensa e Amazon. Devolve mapa de cruzamento, diagnóstico e ideias de post. | 1 — pauta |
| [`carrossel-viral`](.claude/skills/carrossel-viral/SKILL.md) | Escreve o texto de um carrossel de Instagram (5 ganchos de capa, slides com cliffhanger, legenda, checagem de fatos) a partir de uma pauta e na voz do perfil. Salva `carrossel.json`. | 2 — texto |
| [`carrossel-viral-arte`](.claude/skills/carrossel-viral-arte/SKILL.md) | Transforma o `carrossel.json` nas imagens 1080×1350 prontas para postar, com texto desenhado em código (Playwright + Pillow), cor da marca e checagem de contraste e estouro. | 3 — arte |
| [`nanobanana`](.claude/skills/nanobanana/SKILL.md) | Gera imagens para feed, Stories, Reels cover e carrosséis via Gemini (Nano Banana Pro 2) na Google AI API, com legenda, hashtags e CTA. Precisa de `GEMINI_API_KEY`. | independente |

Cada pasta segue o formato padrão de skill: `SKILL.md` (instruções), `scripts/` (utilitários em Python e shell), `references/` (material de apoio). Fontes de terceiros ficam íntegras em `references/fontes/` com as licenças MIT e um `ORIGEM.md` apontando repositório, caminho e commit de origem.

### Instalação

Nas sessões do Claude Code na web, `.claude/hooks/session-start.sh` roda sozinho no início de cada sessão e deixa tudo pronto: Playwright (preso na versão do Chromium do container), Pillow, google-genai, yt-dlp, a CLI do Firecrawl, as fontes Fraunces, Inter e Caveat, a configuração do yt-dlp que contorna o bloqueio do YouTube em IP de nuvem, e os atalhos em `~/.claude/skills/` que as instruções das skills usam.

Duas chaves precisam ser cadastradas como variáveis de ambiente nas configurações do ambiente da nuvem. Nunca comite as chaves.

| Variável | Usada por | Onde obter |
|---|---|---|
| `FIRECRAWL_API_KEY` | `tendencias` (TikTok, Instagram, Reddit, imprensa, Amazon, busca do YouTube) | firecrawl.dev |
| `GEMINI_API_KEY` | `nanobanana` | aistudio.google.com/apikey |

Sem as chaves, o resto já funciona: Google em alta, autocompletar, Google Trends, números e comentários do YouTube, conferência do carrossel e a arte.

Na máquina local, o equivalente é copiar as pastas de `.claude/skills/` para `~/.claude/skills/` e instalar as dependências abaixo.

### Dependências dos scripts

- `tendencias`: `curl`, `yt-dlp`, a CLI `firecrawl` e Python 3 (só biblioteca padrão).
- `carrossel-viral-arte`: `pip install playwright pillow` e `python3 -m playwright install chromium`.
- `nanobanana`: `pip install google-genai pillow` e a variável `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`), no ambiente ou num `.env` na pasta atual. Nunca comite a chave.
