// =====================================================================
// simulacion/lineaTiempo.jsx — UNE LAS ETAPAS EN UNA SOLA LÍNEA DE TIEMPO
// Con 3 o más números la operación se resuelve de dos en dos:
//   A + B + C  →  etapa 1: (A + B)   etapa 2: (resultado + C)
// La barra de la simulación recorre los pasos de TODAS las etapas seguidas.
// =====================================================================

import { leyendaColumnas, prepararColumnas, PizarraColumnas } from './Columnas'
import { leyendaDivision, prepararDivision, PizarraDivision } from './Division'
import { leyendaMultiplicacion, prepararMultiplicacion, PizarraMultiplicacion } from './Multiplicacion'

// Qué pizarra y qué leyenda usa cada tipo de etapa
export const PIZARRAS = {
  columnas: PizarraColumnas,
  multiplicacion: PizarraMultiplicacion,
  division: PizarraDivision,
}
const LEYENDAS = {
  columnas: leyendaColumnas,
  multiplicacion: leyendaMultiplicacion,
  division: leyendaDivision,
}

/** Nombres de las filas de la pizarra en la etapa i (solo suma y resta los usan) */
function rotulosEtapa(operacion, i, etapa) {
  if (operacion === 'suma') return i === 0 ? ['sumando 1', 'sumando 2'] : ['acumulado', `sumando ${i + 2}`]
  if (operacion === 'resta') {
    if (etapa.detalle.acumulado_negativo) return ['|acumulado|', `sustraendo ${i + 1}`]
    return i === 0 ? ['minuendo', 'sustraendo'] : ['acumulado', `sustraendo ${i + 1}`]
  }
  return []
}

/** Prepara el modelo de UNA etapa según su tipo */
function prepararEtapa(etapa, i, operacion) {
  const datos = {
    detalle: etapa.detalle,
    resultado: etapa.resultado,
    residuo: etapa.residuo,
    rotulos: rotulosEtapa(operacion, i, etapa),
  }
  switch (etapa.detalle.tipo) {
    case 'suma':
    case 'resta':
      return prepararColumnas(datos)
    case 'multiplicacion':
      return prepararMultiplicacion(datos)
    default:
      return prepararDivision(datos)
  }
}

/**
 * Construye la línea de tiempo completa a partir del resultado del backend.
 * @param {object} res - objeto "resultado" de POST /api/calcular
 * @returns {{ modelos, inicios, total, ubicar, leyenda }}
 */
export function construirLineaTiempo(res) {
  const modelos = res.etapas.map((e, i) => prepararEtapa(e, i, res.operacion))

  // inicios[e] = paso global donde empieza la etapa e
  const inicios = []
  let total = 0
  modelos.forEach((m) => {
    inicios.push(total)
    total += m.total
  })

  /** Paso global k → [etapa, paso dentro de la etapa] */
  function ubicar(k) {
    let e = modelos.length - 1
    while (inicios[e] > k) e--
    return [e, k - inicios[e]]
  }

  /** Texto que explica el paso global k */
  function leyenda(k) {
    const [e, kl] = ubicar(k)
    const etapa = res.etapas[e]
    const modelo = modelos[e]
    const varias = modelos.length > 1
    const ultimoPasoDeEtapa = kl === modelo.total - 1 && e < modelos.length - 1

    return (
      <>
        {varias && (
          <>
            <span className="tag-etapa">
              Etapa {e + 1} de {modelos.length}
            </span>{' '}
          </>
        )}
        {kl === 0 && etapa.nota && res.operacion === 'resta' && <>{etapa.nota} </>}
        {LEYENDAS[modelo.tipo](modelo, kl)}
        {ultimoPasoDeEtapa && (
          <>
            {etapa.nota && res.operacion === 'division' && <> {etapa.nota}</>} El resultado <b>{etapa.resultado}</b>{' '}
            pasa a la siguiente etapa.
          </>
        )}
      </>
    )
  }

  return { modelos, inicios, total, ubicar, leyenda }
}
