// =====================================================================
// scripts/instalar.mjs — INSTALA TODO CON UN SOLO COMANDO
//
//   npm run instalar        (o doble clic en instalar.bat)
//
// 1. Revisa que tengas Node.js 18+ y Python 3.10+
// 2. Crea el entorno virtual de Python en backend/venv
// 3. Instala FastAPI, Uvicorn y Pydantic (backend/requirements.txt)
// 4. Instala React y Vite (frontend/package.json → frontend/node_modules)
// 5. Comprueba que todo quedó listo
//
// Se puede ejecutar varias veces sin problema: lo que ya está, se reutiliza.
// =====================================================================

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  BACKEND,
  ES_WINDOWS,
  FRONTEND,
  PYTHON_VENV,
  VENV,
  VITE_BIN,
  bien,
  ejecutar,
  fallar,
  leerSalida,
  negritas,
  paso,
  verde,
} from './comun.mjs'

const TOTAL = 5
console.log(negritas('\nSimulador Binario v7 — instalación\n'))

// ---------------------------------------------------------------------
// 1. Requisitos
// ---------------------------------------------------------------------
paso(1, TOTAL, 'Revisando requisitos')

const [mayorNode] = process.versions.node.split('.').map(Number)
if (mayorNode < 18) {
  fallar(`Tienes Node.js ${process.versions.node}; se necesita la versión 18 o más nueva.`, 'Descárgala de https://nodejs.org')
}
bien(`Node.js ${process.versions.node}`)

/**
 * Busca un Python 3.10+ en la computadora.
 * En Windows se prueba primero "py -3" (el lanzador oficial) y luego "python".
 */
function buscarPython() {
  const candidatos = ES_WINDOWS
    ? [['py', ['-3']], ['python', []], ['python3', []]]
    : [['python3', []], ['python', []]]
  for (const [comando, extra] of candidatos) {
    const salida = leerSalida(comando, [...extra, '--version'])
    const m = salida?.match(/Python (\d+)\.(\d+)\.(\d+)/)
    if (!m) continue
    const [mayor, menor] = [Number(m[1]), Number(m[2])]
    if (mayor === 3 && menor >= 10) return { comando, extra, version: `${m[1]}.${m[2]}.${m[3]}` }
  }
  return null
}

const python = buscarPython()
if (!python) {
  fallar(
    'No se encontró Python 3.10 o más nuevo.',
    'Instálalo desde https://www.python.org/downloads/ (en Windows marca «Add python.exe to PATH»).',
  )
}
bien(`Python ${python.version} (${[python.comando, ...python.extra].join(' ')})`)

// ---------------------------------------------------------------------
// 2. Entorno virtual de Python
// ---------------------------------------------------------------------
paso(2, TOTAL, 'Entorno virtual de Python (backend/venv)')

// Si existe la carpeta pero está incompleta o rota (ej. copiada de otra computadora), se rehace
const venvSirve = existsSync(PYTHON_VENV) && leerSalida(PYTHON_VENV, ['--version']) !== null
if (venvSirve) {
  bien('Ya existe, se reutiliza')
} else {
  if (existsSync(VENV)) rmSync(VENV, { recursive: true, force: true })
  const codigo = ejecutar(python.comando, [...python.extra, '-m', 'venv', VENV])
  if (codigo !== 0 || !existsSync(PYTHON_VENV)) {
    fallar(
      'No se pudo crear el entorno virtual.',
      ES_WINDOWS ? '' : 'En Ubuntu/Debian instala el paquete python3-venv (sudo apt install python3-venv).',
    )
  }
  bien('Creado')
}

// ---------------------------------------------------------------------
// 3. Paquetes de Python
// ---------------------------------------------------------------------
paso(3, TOTAL, 'Instalando FastAPI, Uvicorn y Pydantic (requirements.txt)')
const codigoPip = ejecutar(
  PYTHON_VENV,
  ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', join(BACKEND, 'requirements.txt')],
  { cwd: BACKEND },
)
if (codigoPip !== 0) fallar('pip no pudo instalar los paquetes.', 'Revisa tu conexión a internet y vuelve a ejecutar: npm run instalar')
bien('Paquetes de Python instalados')

// ---------------------------------------------------------------------
// 4. Paquetes del frontend
// ---------------------------------------------------------------------
paso(4, TOTAL, 'Instalando React y Vite (npm install en frontend/)')
// En Windows "npm" es un archivo .cmd y necesita ejecutarse a través de la consola (shell)
const codigoNpm = ejecutar(ES_WINDOWS ? 'npm.cmd' : 'npm', ['install', '--no-fund', '--no-audit'], {
  cwd: FRONTEND,
  shell: ES_WINDOWS,
})
if (codigoNpm !== 0) fallar('npm no pudo instalar las dependencias.', 'Revisa tu conexión a internet y vuelve a ejecutar: npm run instalar')
bien('Dependencias del frontend instaladas')

// ---------------------------------------------------------------------
// 5. Comprobación final
// ---------------------------------------------------------------------
paso(5, TOTAL, 'Comprobando la instalación')
const versiones = leerSalida(PYTHON_VENV, [
  '-c',
  'import fastapi, uvicorn, pydantic; print(f"FastAPI {fastapi.__version__} · Uvicorn {uvicorn.__version__} · Pydantic {pydantic.VERSION}")',
])
if (!versiones) fallar('FastAPI no se puede importar desde backend/venv.')
bien(versiones)
if (!existsSync(VITE_BIN)) fallar('No se encontró Vite en frontend/node_modules.')
bien('Vite listo')

console.log(`
${verde(negritas('¡Todo instalado!'))}

  Para arrancar el simulador:   ${negritas('npm run dev')}      (o doble clic en iniciar.bat)
  Para correr las pruebas:      ${negritas('npm test')}
`)
