@echo off
rem instalar.bat - Instala TODO (venv de Python + FastAPI + React/Vite) con un doble clic.
rem Equivale a escribir en la terminal:  npm run instalar
cd /d "%~dp0"
call npm run instalar
echo.
pause
