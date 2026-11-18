@echo off
rem stop.bat - Detiene el backend (8000) y el frontend (5173).
rem Uso: doble clic, o en terminal: .\stop.bat

echo Deteniendo servidores...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = '%~dp0'.ToLower();" ^
  "$procs = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.Name -match '^(python|node)\.exe$' -and $_.CommandLine -and $_.CommandLine.ToLower().Contains($root) -and ($_.CommandLine -match 'uvicorn|vite') };" ^
  "foreach ($p in $procs) { taskkill /F /T /PID $p.ProcessId 2>$null | Out-Null };" ^
  "foreach ($port in 8000,5173) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { taskkill /F /T /PID $_.OwningProcess 2>$null | Out-Null } }"

echo.
echo Listo: servidores detenidos.
ping -n 3 127.0.0.1 >nul
