// =====================================================================
// simulacion/Division.jsx — DIVISIÓN LARGA EN FORMATO "CASITA"
// Como en el cuaderno: el cociente arriba, el divisor a la izquierda y,
// por cada vez que "sí cabe", un bloque de 3 filas (divisor, línea, residuo).
// Cada paso baja un bit del dividendo.
// Datos: etapa.detalle de logica_binaria.dividir().
//
// La casita es una cuadrícula CSS (grid): cada pieza dice en qué fila
// (gridRow) y columna (gridColumn) va.  Columna 1 = divisor/rótulos,
// columnas 2…n+1 = bits del dividendo, columna n+2 = rótulos de la derecha.
// =====================================================================

import { claseBit } from '../components/Bit'
import { calcularAncho } from './Pizarra'

/** Prepara lo que no cambia entre pasos. @param {object} datos - { detalle, resultado, residuo } */
export function prepararDivision({ detalle: d, resultado, residuo }) {
  const { a, b } = d
  const pasos = d.pasos
  const n = a.length

  // Un bloque por cada paso donde el divisor SÍ cupo (se restó). Ocupa 3 filas.
  const bloques = []
  pasos.forEach((p, i) => {
    if (p.resta) bloques.push({ i, L: p.parcial.length, residuo: p.residuo })
  })
  bloques.forEach((bl, j) => {
    bl.ini = bl.i - bl.L + 1                                          // primera columna del bloque
    bl.hasta = j + 1 < bloques.length ? bloques[j + 1].i : n - 1     // hasta dónde se "bajan" bits
    bl.fila = 3 + j * 3                                               // fila de la cuadrícula
  })

  return {
    tipo: 'division',
    a,
    b,
    n,
    m: b.length,
    pasos,
    bloques,
    primerUno: pasos.findIndex((p) => p.bit_cociente === '1'), // ceros del cociente antes de esto = relleno
    total: pasos.length,
    resultado,
    residuo,
  }
}

// Posición en la cuadrícula: fila f, columna de bit c (0 = primer bit del dividendo)
const lugar = (f, c, ancho = 1) => ({
  gridRow: String(f),
  gridColumn: ancho > 1 ? `${c + 2} / span ${ancho}` : String(c + 2),
})

/** Dibuja la casita en el paso k */
export function PizarraDivision({ modelo, k, anchoEscenario }) {
  const { a, b, n, m, pasos, bloques, primerUno } = modelo

  // ---- 1. Resaltados de este paso (claves "A3" = dividendo col 3, "R1:4" = bloque 1 col 4)
  const marcas = new Map()
  const marcar = (clave, clase) => marcas.set(clave, `${marcas.get(clave) ?? ''} ${clase}`)
  const existe = (j, c) => (j < 0 ? c >= 0 && c < n : c >= bloques[j].ini && c <= bloques[j].hasta)
  const clave = (j, c) => (j < 0 ? `A${c}` : `R${j}:${c}`)

  // El número con el que se trabaja en este paso (parcial) se marca en la fila de arriba
  const p = pasos[k]
  let previo = -1 // último bloque ANTES de este paso (-1 = todavía es el dividendo)
  bloques.forEach((bl, j) => {
    if (bl.i < k) previo = j
  })
  for (let c = k - p.parcial.length + 1; c <= k; c++) {
    if (existe(previo, c)) marcar(clave(previo, c), 'activa')
  }
  // Último paso: el residuo final en verde
  if (k === pasos.length - 1) {
    const j = bloques.length - 1
    for (let c = n - modelo.residuo.length; c < n; c++) {
      if (existe(j, c)) marcar(clave(j, c), 'resfinal')
    }
  }
  const extra = (c) => marcas.get(c) ?? ''

  // ---- 2. Último bloque visible (para saber qué celda mostrar en pantalla)
  let ultimo = -1
  bloques.forEach((bl, j) => {
    if (bl.i <= k) ultimo = j
  })
  const foco = ultimo >= 0 && existe(ultimo, k) ? clave(ultimo, k) : `A${k}`

  // ---- 3. Piezas fijas: cociente, divisor, techo y dividendo
  const piezas = []
  const rotulo = (key, texto, f, col, clases = '') =>
    piezas.push(
      <span key={key} className={`rotulo ${clases}`.trim()} style={{ gridRow: String(f), gridColumn: String(col) }}>
        {texto}
      </span>,
    )

  rotulo('r-divisor', 'divisor', 1, 1, 'izq')
  for (let i = 0; i < n; i++) {
    // Cociente: los bits aparecen uno por paso; ceros iniciales atenuados (relleno)
    if (i > k) {
      piezas.push(<div key={`q${i}`} className="bit pendiente" style={lugar(1, i)} />)
    } else {
      const bc = pasos[i].bit_cociente
      const relleno = primerUno === -1 || i < primerUno ? ' relleno' : ''
      piezas.push(
        <div key={`q${i}`} className={claseBit(bc, i === k ? 'nuevo' : '') + relleno} style={lugar(1, i)}>
          {bc}
        </div>,
      )
    }
  }
  rotulo('r-cociente', 'cociente', 1, n + 2)

  piezas.push(
    <div key="divisor" className="divisor" style={{ gridRow: '2', gridColumn: '1' }}>
      {[...b].map((c, i) => (
        <div key={i} className={claseBit(c)}>
          {c}
        </div>
      ))}
    </div>,
  )
  piezas.push(<div key="techo" className="techo" style={lugar(2, 0, n)} />)
  for (let i = 0; i < n; i++) {
    // Dividendo: los bits que aún no se bajan se ven tenues
    const clases = `bit dv${a[i] === '1' ? ' uno' : ''}${i > k ? ' tenue' : ''}${extra(`A${i}`)}`
    piezas.push(
      <div key={`a${i}`} className={clases} style={lugar(2, i)} data-foco={foco === `A${i}` ? '' : undefined}>
        {a[i]}
      </div>,
    )
  }
  rotulo('r-dividendo', 'dividendo', 2, n + 2)

  // ---- 4. Bloques (divisor − línea − residuo), ocultos hasta su paso
  bloques.forEach((bl, j) => {
    const visible = bl.i <= k
    const esNuevo = bl.i === k // el bloque aparece completo en su paso
    // Clases dinámicas de cada pieza del bloque
    const estado = (col) => {
      if (!visible) return ' fuera'
      if (col !== undefined && col > k) return ' fuera' // bits bajados que todavía no llegan
      if (esNuevo || (col !== undefined && col === k)) return ' nuevo'
      return ''
    }

    const divisor = b.padStart(bl.L, '0')
    const resid = bl.residuo.padStart(bl.L, '0')

    // Divisor colocado debajo del parcial
    ;[...divisor].forEach((c, t) => {
      const relleno = c === '0' && t < bl.L - m ? 'relleno' : ''
      piezas.push(
        <div key={`b${j}p${t}`} className={claseBit(c, relleno) + estado()} style={lugar(bl.fila, bl.ini + t)}>
          {c}
        </div>,
      )
    })
    rotulo(`b${j}rp`, '− divisor', bl.fila, n + 2, estado())
    piezas.push(<div key={`b${j}l`} className={`linea-c${estado()}`} style={lugar(bl.fila + 1, bl.ini, bl.L)} />)

    // Residuo de la resta…
    ;[...resid].forEach((c, t) => {
      const col = bl.ini + t
      const relleno = t < bl.L - bl.residuo.length ? 'relleno' : ''
      piezas.push(
        <div
          key={`b${j}r${col}`}
          className={claseBit(c, relleno) + estado() + extra(clave(j, col))}
          style={lugar(bl.fila + 2, col)}
          data-foco={foco === clave(j, col) ? '' : undefined}
        >
          {c}
        </div>,
      )
    })
    // …y a su derecha los bits que se van "bajando" del dividendo
    for (let col = bl.i + 1; col <= bl.hasta; col++) {
      piezas.push(
        <div
          key={`b${j}r${col}`}
          className={claseBit(a[col], 'bajado') + estado(col) + extra(clave(j, col))}
          style={lugar(bl.fila + 2, col)}
          data-foco={foco === clave(j, col) ? '' : undefined}
        >
          {a[col]}
        </div>,
      )
    }
    rotulo(`b${j}rr`, 'residuo', bl.fila + 2, n + 2, estado())
  })

  return (
    <div className="casita" style={{ '--n': n, '--w': `${calcularAncho(anchoEscenario, n + m, 130, 40)}px` }}>
      {piezas}
    </div>
  )
}

/** Explicación en palabras del paso k */
export function leyendaDivision(modelo, k) {
  const p = modelo.pasos[k]
  const { b } = modelo
  const fin = k === modelo.pasos.length - 1 ? (
    <>
      {' '}Fin: cociente <b>{modelo.resultado}</b>, residuo <b>{modelo.residuo}</b>.
    </>
  ) : null

  return p.resta ? (
    <>
      Bajo el bit <b>{p.bit}</b>: el número con el que trabajo es <b>{p.parcial}</b>. Como {p.parcial} ≥ {b}, el
      divisor <b>sí cabe</b>: escribo <b>1</b> arriba, pongo {b} debajo y resto: {p.parcial} − {b} ={' '}
      <b>{p.residuo}</b>.{fin}
    </>
  ) : (
    <>
      Bajo el bit <b>{p.bit}</b>: el número con el que trabajo es <b>{p.parcial}</b>. Como {p.parcial} &lt; {b}, el
      divisor <b>no cabe</b>: escribo <b>0</b> arriba y no resto nada.{fin}
    </>
  )
}
