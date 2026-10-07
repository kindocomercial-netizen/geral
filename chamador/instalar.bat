@echo off
title Instalador do Chamador Kindo
cd /d "%~dp0"
echo ============================================
echo   Instalador do Chamador Kindo
echo ============================================
echo.

call :achar_python
if not defined PY (
  echo Python nao encontrado. Instalando o Python agora, aguarde...
  winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
  call :achar_python
)
if not defined PY (
  echo.
  echo Nao consegui instalar o Python sozinho.
  echo Baixe em https://www.python.org/downloads/ - na instalacao marque "Add Python to PATH".
  echo Depois rode este instalador de novo.
  pause
  exit /b 1
)
echo Python encontrado: %PY%
echo.

"%PY%" chamador.py configurar
if errorlevel 1 ( pause & exit /b 1 )
echo.
echo ---- Testando a leitura do WhatsApp (LetsBot) ----
"%PY%" chamador.py testar
echo.
echo ---- Agora vai tocar o aviso de teste: fique perto da caixa e da Alexa ----
pause
"%PY%" chamador.py falar
echo.

echo Colocando o Chamador para abrir sozinho quando o computador ligar...
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Chamador Kindo.lnk'); $s.TargetPath='%~dp0iniciar.bat'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
echo.
echo Pronto! O Chamador vai abrir agora numa janela minimizada. Nao feche essa janela.
start "Chamador Kindo" /min "%~dp0iniciar.bat"
pause
exit /b 0

:achar_python
set "PY="
for /f "delims=" %%i in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if defined PY goto :eof
for /f "delims=" %%i in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if defined PY goto :eof
for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%d\python.exe" set "PY=%%d\python.exe"
goto :eof
