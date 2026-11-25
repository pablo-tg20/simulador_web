// =====================================================================
// services/api.js — PUENTE ENTRE LA INTERFAZ Y EL BACKEND
// Es el ÚNICO archivo que habla con FastAPI (backend/main.py).
// Los componentes nunca hacen fetch directamente: siempre pasan por aquí.
//
// En la v6 este papel lo hacía apiFetch() + puente.py dentro del navegador.
// Ahora cada función hace una petición HTTP real al servidor.
// =====================================================================

// Dirección del backend:
// - Publicado en internet (VITE_MISMO_SERVIDOR=1 al compilar): la API vive en la
//   misma dirección que la página, así que se usa window.location.origin.
// - En tu computadora: Vite lee VITE_API_URL del archivo .env (ver .env.example).
//   El operador ?? usa el valor de la derecha si la variable no existe.
export const MISMO_SERVIDOR = import.meta.env.VITE_MISMO_SERVIDOR === '1'
export const API_URL = MISMO_SERVIDOR
  ? window.location.origin
  : (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000')

/**
 * Error que viene del servidor con la forma {ok:false, error:{tipo, mensaje}}.
 * Ejemplos: dato inválido, división entre 0, modo desconocido.
 */
export class ErrorApi extends Error {
  constructor(tipo, mensaje, estado) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.tipo = tipo     // "EntradaInvalida", "DivisionPorCero"...
    this.estado = estado // código HTTP: 422, 404, 500...
  }
}

/**
 * Error de RED: el servidor no contestó (apagado, puerto equivocado, sin CORS...).
 */
export class ErrorConexion extends Error {
  constructor() {
    super(
      MISMO_SERVIDOR
        ? 'No se pudo conectar con el servidor. Puede estar despertando; intenta de nuevo en unos segundos.'
        : 'No se pudo conectar con el servidor. Revisa que el backend esté encendido ' +
            `(npm run dev) en ${API_URL}.`,
    )
    this.name = 'ErrorConexion'
  }
}

/**
 * Función base: hace la petición, revisa la respuesta y devuelve el JSON.
 * @param {string} ruta   - Ej. "/api/calcular"
 * @param {object} [datos] - Si se pasa, la petición es POST con este objeto en JSON.
 * @returns {Promise<object>} El JSON de la respuesta (cuando ok).
 */
async function pedir(ruta, datos) {
  const opciones = datos === undefined
    ? { method: 'GET' }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // le avisa a FastAPI que mandamos JSON
        body: JSON.stringify(datos),                      // objeto de JS → texto JSON
      }

  // 1) Mandar la petición. Si el servidor está apagado, fetch lanza un TypeError.
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones)
  } catch {
    throw new ErrorConexion()
  }

  // 2) Leer el cuerpo como JSON (texto JSON → objeto de JS)
  let cuerpo
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ErrorApi('RespuestaInvalida', 'El servidor respondió algo que no se pudo entender.', respuesta.status)
  }

  // 3) Si el código HTTP no es 2xx, el servidor mandó {ok:false, error:{...}}
  if (!respuesta.ok || cuerpo?.ok === false) {
    const error = cuerpo?.error ?? {}
    throw new ErrorApi(
      error.tipo ?? 'Error',
      error.mensaje ?? `Error del servidor: ${respuesta.status}`,
      respuesta.status,
    )
  }
  return cuerpo
}

// ---------------------------------------------------------------------
// Una función por ruta del backend (ver backend/main.py)
// ---------------------------------------------------------------------

/** GET /api/operaciones → { operaciones: [...], max_bits, max_numeros, max_caracteres } */
export function obtenerOperaciones() {
  return pedir('/api/operaciones')
}

/** POST /api/convertir-numero → objeto "conversion" (decimal ↔ binario) */
export async function convertirNumero(modo, valor) {
  const datos = await pedir('/api/convertir-numero', { modo, valor })
  return datos.conversion
}

/** POST /api/convertir → objeto "conversion" (texto ↔ ASCII ↔ binario) */
export async function convertirTexto(modo, texto) {
  const datos = await pedir('/api/convertir', { modo, texto })
  return datos.conversion
}

/** GET /api/tabla-ascii → lista de grupos [{clave, nombre, filas}] */
export async function obtenerTablaAscii() {
  const datos = await pedir('/api/tabla-ascii')
  return datos.grupos
}

/** POST /api/calcular → objeto "resultado" con etapas y datos para animar */
export async function calcular(operacion, numeros) {
  const datos = await pedir('/api/calcular', { operacion, numeros })
  return datos.resultado
}

/** GET /api/pruebas → filas de los casos de prueba de la rúbrica */
export async function ejecutarPruebas() {
  const datos = await pedir('/api/pruebas')
  return datos.pruebas
}
