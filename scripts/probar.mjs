// =====================================================================
// scripts/probar.mjs — CORRE LAS PRUEBAS AUTOMÁTICAS DEL BACKEND
//
//   npm test
//
// 1. Pruebas de la API (backend/tests/test_api.py): levantan el servidor de
//    verdad y le hacen peticiones HTTP como lo haría el navegador.
// 2. Casos de la rúbrica (backend/pruebas.py), los mismos de la sección «Pruebas».
// =====================================================================

import { BACKEND, PYTHON_VENV, ejecutar, negritas, paso, revisarInstalacion, rojo, verde } from './comun.mjs'

revisarInstalacion({ frontend: false }) // las pruebas solo necesitan el backend

paso(1, 2, 'Pruebas de la API (tests/test_api.py)')
const api = ejecutar(PYTHON_VENV, ['-m', 'unittest', 'discover', '-s', 'tests', '-v'], { cwd: BACKEND })

paso(2, 2, 'Casos de la rúbrica (pruebas.py)')
const rubrica = ejecutar(PYTHON_VENV, ['pruebas.py'], { cwd: BACKEND })

const todo = api === 0 && rubrica === 0
console.log(`\n${todo ? verde(negritas('✔ Todas las pruebas pasaron.')) : rojo(negritas('✖ Hubo pruebas con fallas (revisa arriba).'))}\n`)
process.exit(todo ? 0 : 1)
