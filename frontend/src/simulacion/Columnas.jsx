// =====================================================================
// simulacion/Columnas.jsx — SUMA Y RESTA, COLUMNA POR COLUMNA
// Cada paso resuelve una columna (de derecha a izquierda), escribe el bit
// del resultado y pasa el acarreo (suma) o el préstamo (resta) a la izquierda.
// Los datos vienen del backend: etapa.detalle (logica_binaria.sumar / restar).
// =====================================================================

import { claseBit } from '../components/Bit'
import { Fila, HUECO, PENDIENTE, Pizarra, Regla, calcularAncho } from './Pizarra'

/**
 * Prepara todo lo que NO cambia entre pasos (se calcula una sola vez).
 * @param {object} datos - { detalle, rotulos }
 */
export function prepararColumnas({ detalle: d, rotulos }) {
  const n = d.fila_a.length
  const acumNeg = !!d.acumulado_negativo // resta con acumulado negativo: −X − Y = −(X + Y)
  const cols = n + 1 + (acumNeg ? 1 : 0) // +1 para el acarreo final (+1 para el signo)
  const esResta = d.tipo === 'resta'
  const invertido = esResta && d.negativo // minuendo menor → se resta al revés

  // Lista de pasos: una columna por paso, luego (si aplica) acarreo final y signo
  const pasos = d.columnas.map((c) => ({ t: 'col', c }))
  if (!esResta && d.acarreo_final) pasos.push({ t: 'final' })
  if (invertido || acumNeg) pasos.push({ t: 'signo' })

  return {
    tipo: 'columnas',
    d,
    cols,
    ini: cols - n, // primera columna que tiene bits
    esResta,
    acumNeg,
    invertido,
    pasos,
    total: pasos.length,
    nombre: esResta ? 'préstamo' : 'acarreo',
    operador: esResta ? '−' : '+',
    rotuloArriba: invertido ? 'el mayor' : rotulos[0],
    rotuloAbajo: invertido ? 'el menor' : rotulos[1],
  }
}

/**
 * Dibuja la pizarra tal como se ve en el paso k.
 * Props: modelo (de prepararColumnas), k (paso), anchoEscenario (px)
 */
export function PizarraColumnas({ modelo, k, anchoEscenario }) {
  const { d, cols, ini, pasos } = modelo

  // Estado inicial: acarreos vacíos y resultado pendiente
  const acarreo = Array.from({ length: cols }, () => ({ valor: '', clase: 'bit hueco acarreo' }))
  const resultado = Array.from({ length: cols }, () => PENDIENTE)
  const activasResultado = new Set() // columnas resaltadas en el resultado
  const activasOperandos = new Set() // columnas resaltadas en las dos filas de arriba

  // "Reproducimos" los pasos 0..k para saber cómo queda la pizarra
  for (let i = 0; i <= k; i++) {
    const p = pasos[i]
    const nuevo = i === k ? 'nuevo' : '' // el bit del paso actual aparece con animación
    if (p.t === 'col') {
      const idx = cols - 1 - p.c.pos // pos 0 = columna de la derecha
      resultado[idx] = { valor: String(p.c.bit), clase: claseBit(String(p.c.bit), nuevo) }
      if (p.c.sale === 1) {
        // el acarreo/préstamo pasa a la columna de la izquierda
        acarreo[idx - 1] = { valor: '1', clase: `bit acarreo${nuevo ? ' nuevo' : ''}` }
      }
      if (nuevo) {
        activasResultado.add(idx)
        activasOperandos.add(idx)
      }
    } else if (p.t === 'final') {
      resultado[ini - 1] = { valor: '1', clase: claseBit('1', nuevo) }
      if (nuevo) activasResultado.add(ini - 1)
    } else {
      // signo negativo en la primera columna
      resultado[0] = { valor: '−', clase: `bit${nuevo ? ' nuevo' : ''} uno` }
    }
  }

  // Fila de un operando (alineada a la derecha) con la columna activa resaltada
  const operando = (bits) =>
    Array.from({ length: cols }, (_, i) =>
      i < ini
        ? HUECO
        : { valor: bits[i - ini], clase: claseBit(bits[i - ini], activasOperandos.has(i) ? 'activa' : '') },
    )

  const filaResultado = resultado.map((celda, i) =>
    activasResultado.has(i) ? { ...celda, clase: `${celda.clase} activa` } : celda,
  )

  return (
    <Pizarra ancho={calcularAncho(anchoEscenario, cols)}>
      <Fila etiqueta={modelo.nombre} celdas={acarreo} />
      <Fila etiqueta={modelo.rotuloArriba} celdas={operando(d.fila_a)} />
      <Fila etiqueta={`${modelo.operador} ${modelo.rotuloAbajo}`} celdas={operando(d.fila_b)} />
      <Regla />
      <Fila etiqueta="resultado" celdas={filaResultado} />
    </Pizarra>
  )
}

/** Explicación en palabras del paso k */
export function leyendaColumnas(modelo, k) {
  const { pasos, esResta, acumNeg, invertido } = modelo
  const p = pasos[k]

  if (p.t === 'final') {
    return <>Sobró un acarreo de <b>1</b> al terminar: se escribe al inicio del resultado.</>
  }
  if (p.t === 'signo' && acumNeg) {
    return <>Como el acumulado era negativo, el resultado conserva el signo <b>−</b>.</>
  }
  if (p.t === 'signo') {
    return (
      <>
        El minuendo era menor que el sustraendo: se calculó <b>mayor − menor</b>, así que el resultado lleva
        signo <b>−</b>.
      </>
    )
  }

  const { pos, a, b, entra, bit: r, sale } = p.c
  const intro = k === 0 && invertido
    ? 'El minuendo es menor que el sustraendo, así que se resta al revés (mayor − menor) y al final se pone signo. '
    : ''

  if (!esResta) {
    return (
      <>
        {intro}Columna <b>{pos + 1}</b>: {a} + {b} + acarreo {entra} = <b>{a + b + entra}</b>. Escribo <b>{r}</b> y{' '}
        {sale ? <>llevo <b>1</b> a la siguiente columna</> : 'no llevo nada'}.
      </>
    )
  }

  const quitar = b + entra
  return (
    <>
      {intro}Columna <b>{pos + 1}</b>: {a} − {b} − préstamo {entra}.{' '}
      {sale ? (
        <>
          {a} es menor que {quitar}: pido prestado (vale 2) → {a} + 2 − {quitar} = <b>{r}</b>, y debo <b>1</b> a la
          siguiente
        </>
      ) : (
        <>
          {a} − {quitar} = <b>{r}</b>, sin préstamo
        </>
      )}
      .
    </>
  )
}
