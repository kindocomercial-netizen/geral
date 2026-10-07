#!/bin/bash
# Instalador do Chamador Kindo para Mac. Dê dois cliques (ou botão direito > Abrir).
cd "$(dirname "$0")" || exit 1
DEST="$HOME/Kindo-Chamador"
PLIST="$HOME/Library/LaunchAgents/com.kindo.chamador.plist"

echo "============================================"
echo "  Instalador do Chamador Kindo (Mac)"
echo "============================================"
echo

PY=""
for p in /Library/Frameworks/Python.framework/Versions/Current/bin/python3 \
         /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
  if [ -x "$p" ] && "$p" -c 'import sys; assert sys.version_info >= (3, 9)' 2>/dev/null; then
    PY="$p"; break
  fi
done
if [ -z "$PY" ]; then
  echo "O Mac ainda não tem o Python."
  echo "Vai abrir uma janela pedindo para instalar as 'ferramentas de linha de comando': clique em Instalar."
  echo "Quando terminar, dê dois cliques neste instalador de novo."
  xcode-select --install 2>/dev/null
  read -r -p "Aperte Enter para fechar..."
  exit 1
fi
echo "Python: $PY"

mkdir -p "$DEST"
cp chamador.py config.exemplo.ini LEIA-ME.md "$DEST/"
[ -f exemplo-aviso.mp3 ] && cp exemplo-aviso.mp3 "$DEST/"
cp desinstalar.command "$DEST/" 2>/dev/null
cd "$DEST" || exit 1

if [ -f config.ini ]; then
  read -r -p "Já existe uma configuração. Quer trocar as chaves? (s/N) " R
  [ "$R" = "s" ] || [ "$R" = "S" ] && "$PY" chamador.py configurar
else
  "$PY" chamador.py configurar || exit 1
fi

echo
echo "---- Testando a leitura do WhatsApp (LetsBot) ----"
"$PY" chamador.py testar
echo
echo "---- Agora vai tocar o aviso de teste: aumente o volume e fique perto da Alexa ----"
read -r -p "Aperte Enter para tocar..."
"$PY" chamador.py falar
echo

echo "Deixando o Chamador ligado sempre (abre sozinho quando o Mac liga)..."
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.kindo.chamador</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string><string>-i</string>
    <string>$PY</string><string>$DEST/chamador.py</string>
  </array>
  <key>WorkingDirectory</key><string>$DEST</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$DEST/chamador.log</string>
  <key>StandardErrorPath</key><string>$DEST/chamador.log</string>
</dict>
</plist>
PL
launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"

echo
echo "Pronto! O Chamador está ligado em segundo plano (não precisa deixar janela aberta)."
echo "O Mac não vai dormir enquanto ele estiver rodando."
echo "Para ver o que ele está fazendo: abra $DEST/chamador.log"
echo "Para desligar de vez: dois cliques em $DEST/desinstalar.command"
read -r -p "Aperte Enter para fechar..."
