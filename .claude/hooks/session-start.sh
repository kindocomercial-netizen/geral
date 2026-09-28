#!/bin/bash
# Prepara o container da nuvem para as skills de .claude/skills/ rodarem.
# Idempotente: pula o que já está instalado. Só roda no Claude Code na web.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# 1. Pacotes Python. O Playwright fica preso na versão que casa com o
#    Chromium pré-instalado em /opt/pw-browsers (revisão 1194).
PW_VERSAO="1.56.0"
if ! python3 -c "import playwright, PIL, google.genai" 2>/dev/null \
   || [ "$(python3 -c 'from importlib.metadata import version; print(version("playwright"))' 2>/dev/null)" != "$PW_VERSAO" ]; then
  pip3 install --break-system-packages --root-user-action=ignore -q "playwright==$PW_VERSAO" pillow google-genai
fi
command -v yt-dlp >/dev/null || pip3 install --break-system-packages --root-user-action=ignore -q yt-dlp
if [ ! -d /opt/pw-browsers/chromium_headless_shell-1194 ]; then
  echo "AVISO: o Chromium 1194 não está em /opt/pw-browsers; ajuste PW_VERSAO neste script." >&2
fi

# 2. CLI oficial do Firecrawl (github.com/firecrawl/cli). Precisa de FIRECRAWL_API_KEY.
command -v firecrawl >/dev/null || npm install -g firecrawl-cli >/dev/null 2>&1

# 3. yt-dlp: contorna o bloqueio "confirme que não é um robô" do YouTube em IP de nuvem.
mkdir -p "$HOME/.config/yt-dlp"
cat > "$HOME/.config/yt-dlp/config" <<'CFG'
--js-runtimes node
--ignore-no-formats-error
--extractor-args youtube:player_client=mweb,web_embedded
CFG

# 4. Fontes da arte do carrossel instaladas no sistema, porque o Chromium do
#    Playwright não passa pelo proxy e não carrega o Google Fonts sozinho.
FONTES_DIR="$HOME/.local/share/fonts/google"
if ! fc-list | grep -q "Fraunces"; then
  mkdir -p "$FONTES_DIR"
  for fam in "Fraunces:wght@300;500;700" "Inter:wght@400;600" "Caveat:wght@500"; do
    nome="${fam%%:*}"
    curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=${fam}" \
      | grep -oE "https://fonts.gstatic.com/[^)]+" | sort -u | nl -w1 -s' ' \
      | while read -r i url; do curl -sS -o "$FONTES_DIR/${nome}-${i}.ttf" "$url"; done
  done
  fc-cache -f >/dev/null
fi

# 5. As instruções das skills usam ~/.claude/skills/<skill>/...; aponta para o repo.
mkdir -p "$HOME/.claude/skills"
for s in tendencias carrossel-viral carrossel-viral-arte nanobanana; do
  ln -sfn "$REPO/.claude/skills/$s" "$HOME/.claude/skills/$s"
done

# 6. Pastas onde as skills salvam relatórios e carrosséis.
mkdir -p "$HOME/pesquisas" "$HOME/carrosseis" "$HOME/.tendencias"

echo "skills prontas: tendencias, carrossel-viral, carrossel-viral-arte, nanobanana"
