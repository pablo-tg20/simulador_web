// =====================================================================
// scripts/dev.mjs — ARRANCA BACKEND Y FRONTEND JUNTOS
//
//   npm run dev        (o doble clic en iniciar.bat)
//
//   [API] FastAPI con Uvicorn en http://127.0.0.1:8000  (se reinicia solo al guardar un .py)
//   [WEB] Vite + React en       http://localhost:5173   (se actualiza solo al guardar un .jsx/.css)
//
// Ctrl + C detiene los dos.
// =====================================================================

import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import {
  BACKEND,
  ENTORNO,
  ES_WINDOWS,
  FRONTEND,
  PYTHON_VENV,
  VITE_BIN,
  cian,
  fallar,
  negritas,
  revisarInstalacion,
  verde,
} from './comun.mjs'

const PUERTO_API = 8000
const PUERTO_WEB = 5173

revisarInstalacion()

/** ¿El puerto está libre? (intenta ocuparlo un instante) */
function puertoLibre(puerto) {
  return new Promise((resolver) => {
    const servidor = createServer()
    servidor.once('error', () => resolver(false))
    servidor.once('listening', () => servidor.close(() => resolver(true)))
    servidor.listen(puerto, '127.0.0.1')
  })
}

for (const [puerto, quien] of [[PUERTO_API, 'backend'], [PUERTO_WEB, 'frontend']]) {
  if (!(await puertoLibre(puerto))) {
    fallar(
      `El puerto ${puerto} (${quien}) ya está ocupado: probablemente el simulador ya está corriendo.`,
      ES_WINDOWS ? 'Ciérralo con stop.bat (o la tarea «stop» de VS Code) y vuelve a intentar.' : `Cierra el proceso que usa el puerto ${puerto}.`,
    )
  }
}

const procesos = []
let cerrando = false

/** Arranca un proceso y antepone una etiqueta de color a cada línea de su salida */
function arrancar(etiqueta, pintar, comando, argumentos, cwd) {
  const hijo = spawn(comando, argumentos, { cwd, env: { ...ENTORNO, FORCE_COLOR: '1' } })
  const prefijo = pintar(`[${etiqueta}]`)
  const reenviar = (destino) => (datos) => {
    for (const linea of datos.toString().split(/\r?\n/)) if (linea.trim()) destino.write(`${prefijo} ${linea}\n`)
  }
  hijo.stdout.on('data', reenviar(process.stdout))
  hijo.stderr.on('data', reenviar(process.stderr))
  hijo.on('exit', (codigo) => {
    if (!cerrando) {
      console.log(`\n${prefijo} terminó (código ${codigo}). Deteniendo todo…`)
      cerrarTodo(codigo ?? 1)
    }
  })
  procesos.push(hijo)
  return hijo
}

/** Detiene los procesos hijos (y los procesos que ellos crearon) */
function cerrarTodo(codigo = 0) {
  if (cerrando) return
  cerrando = true
  for (const hijo of procesos) {
    if (hijo.exitCode !== null) continue
    if (ES_WINDOWS) {
      // /T = también los procesos hijos (Uvicorn --reload crea uno) · /F = forzar
      spawnSync('taskkill', ['/pid', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      hijo.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(codigo), 300)
}

process.on('SIGINT', () => cerrarTodo(0))  // Ctrl + C
process.on('SIGTERM', () => cerrarTodo(0))

console.log(negritas('\nSimulador Binario v7 — modo desarrollo'))
console.log(`  ${cian('[API]')} http://127.0.0.1:${PUERTO_API}   (documentación: http://127.0.0.1:${PUERTO_API}/docs)`)
console.log(`  ${verde('[WEB]')} http://localhost:${PUERTO_WEB}   ← abre esta en el navegador`)
console.log('  Ctrl + C para detener los dos.\n')

arrancar('API', cian, PYTHON_VENV, ['-m', 'uvicorn', 'main:app', '--reload', '--port', String(PUERTO_API)], BACKEND)
arrancar('WEB', verde, process.execPath, [VITE_BIN], FRONTEND)
