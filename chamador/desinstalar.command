#!/bin/bash
# Desliga o Chamador Kindo e tira da inicialização do Mac (a pasta com as chaves fica).
PLIST="$HOME/Library/LaunchAgents/com.kindo.chamador.plist"
launchctl unload "$PLIST" 2>/dev/null
rm -f "$PLIST"
echo "Chamador desligado. Para ligar de novo, rode o instalar.command."
read -r -p "Aperte Enter para fechar..."
