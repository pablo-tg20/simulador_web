@echo off
rem iniciar.bat - Arranca el backend (8000) y el frontend (5173) y abre el navegador.
rem Equivale a escribir en la terminal:  npm run dev
rem Para detenerlo: Ctrl + C en esta ventana (o stop.bat).
cd /d "%~dp0"
call npm run dev
