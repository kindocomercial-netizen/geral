@echo off
title Chamador Kindo
cd /d "%~dp0"
:loop
python chamador.py
echo O chamador parou. Reiniciando em 10 segundos...
timeout /t 10 >nul
goto loop
