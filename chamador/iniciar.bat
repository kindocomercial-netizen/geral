@echo off
title Chamador Kindo
cd /d "%~dp0"
call :achar_python
if not defined PY ( echo Python nao encontrado. Rode o instalar.bat. & pause & exit /b 1 )
:loop
"%PY%" chamador.py
echo O chamador parou. Reiniciando em 10 segundos...
timeout /t 10 >nul
goto loop

:achar_python
set "PY="
for /f "delims=" %%i in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if defined PY goto :eof
for /f "delims=" %%i in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PY=%%i"
if defined PY goto :eof
for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%d\python.exe" set "PY=%%d\python.exe"
goto :eof
