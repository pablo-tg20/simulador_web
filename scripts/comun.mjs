// =====================================================================
// scripts/comun.mjs — Funciones que comparten instalar.mjs, dev.mjs y probar.mjs
// Solo usa módulos que ya vienen con Node.js (no hay que instalar nada).
// =====================================================================

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ES_WINDOWS = process.platform === 'win32'

// Rutas del proyecto (calculadas a partir de la ubicación de este archivo)
export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
export const BACKEND = join(RAIZ, 'backend')
export const FRONTEND = join(RAIZ, 'frontend')
export const VENV = join(BACKEND, 'venv')

// En Windows el Python del venv está en Scripts\python.exe; en Mac/Linux en bin/python
export const PYTHON_VENV = ES_WINDOWS ? join(VENV, 'Scripts', 'python.exe') : join(VENV, 'bin', 'python')

// Vite se ejecuta directo con Node (así funciona igual en Windows, Mac y Linux)
export const VITE_BIN = join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')

// Variables de entorno para Python: UTF-8 siempre (en Windows evita errores con acentos y símbolos)
export const ENTORNO = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' }

// Colores para la terminal
const color = (codigo) => (texto) => (process.stdout.isTTY ? `\x1b[${codigo}m${texto}\x1b[0m` : texto)
export const verde = color('32')
export const rojo = color('31')
export const amarillo = color('33')
export const cian = color('36')
export const negritas = color('1')

export const paso = (n, total, texto) => console.log(`\n${cian(`[${n}/${total}]`)} ${negritas(texto)}`)
export const bien = (texto) => console.log(`  ${verde('✔')} ${texto}`)
export const aviso = (texto) => console.log(`  ${amarillo('!')} ${texto}`)

/** Termina el script con un mensaje de error claro */
export function fallar(mensaje, sugerencia = '') {
  console.error(`\n  ${rojo('✖')} ${mensaje}`)
  if (sugerencia) console.error(`    ${sugerencia}`)
  console.error('')
  process.exit(1)
}

/**
 * Ejecuta un comando mostrando su salida en la terminal y espera a que termine.
 * @returns {number} código de salida (0 = todo bien)
 */
export function ejecutar(comando, argumentos, opciones = {}) {
  const r = spawnSync(comando, argumentos, { stdio: 'inherit', env: ENTORNO, ...opciones })
  if (r.error) return -1
  return r.status ?? 1
}

/** Ejecuta un comando en silencio y devuelve su salida de texto (o null si falla) */
export function leerSalida(comando, argumentos) {
  const r = spawnSync(comando, argumentos, { encoding: 'utf8', env: ENTORNO })
  if (r.error || r.status !== 0) return null
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim()
}

/**
 * ¿Ya se instaló todo? (venv con FastAPI + node_modules con Vite)
 * @param {{frontend?: boolean}} [opciones] - frontend:false revisa solo el backend (para las pruebas)
 */
export function revisarInstalacion({ frontend = true } = {}) {
  const faltantes = []
  if (!existsSync(PYTHON_VENV)) faltantes.push('el entorno de Python (backend/venv)')
  if (frontend && !existsSync(VITE_BIN)) faltantes.push('las dependencias del frontend (frontend/node_modules)')
  if (faltantes.length) {
    fallar(`Falta instalar ${faltantes.join(' y ')}.`, `Ejecuta primero:  ${negritas('npm run instalar')}`)
  }
}
