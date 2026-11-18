// =====================================================================
// simulacion/Pizarra.jsx — PIEZAS COMUNES DE LAS SIMULACIONES
// Una "pizarra" es una cuadrícula de filas: etiqueta a la izquierda y
// celdas (bits) a la derecha, como cuando se resuelve en el cuaderno.
// =====================================================================

/**
 * Calcula el ancho de cada bit para que la pizarra quepa en el escenario.
 * @param {number} anchoEscenario - ancho medido del escenario (px)
 * @param {number} columnas       - cuántos bits hay por fila
 * @param {number} [reservado]    - espacio para las etiquetas de la izquierda
 * @param {number} [tope]         - ancho máximo de un bit
 */
export function calcularAncho(anchoEscenario, columnas, reservado, tope = 56) {
  const reserva = reservado ?? (window.innerWidth <= 900 ? 84 : 118)
  const disponible = anchoEscenario - 48 - reserva
  return Math.max(12, Math.min(tope, Math.floor(disponible / columnas) - 6))
}

// Celdas de apoyo (mismas clases CSS que en la v6)
export const HUECO = { valor: '', clase: 'bit hueco' }          // espacio vacío
export const PENDIENTE = { valor: '', clase: 'bit pendiente' }  // bit que aún no se calcula

/** Contenedor de la pizarra: fija el tamaño de los bits con la variable --w */
export function Pizarra({ ancho, children }) {
  return (
    <div className="pizarra" style={{ '--w': `${ancho}px` }}>
      {children}
    </div>
  )
}

/**
 * Una fila de la pizarra.
 * Props:
 *   etiqueta -> texto de la izquierda ("acarreo", "resultado"...)
 *   celdas   -> lista de { valor, clase }
 *   oculta   -> true para esconderla (aparece con animación cuando llega su paso)
 */
export function Fila({ etiqueta, celdas, oculta = false }) {
  return (
    <div className={`fila${oculta ? ' oculta' : ''}`}>
      <span className="etiqueta">{etiqueta}</span>
      <div className="celdas" style={{ '--cols': celdas.length }}>
        {celdas.map((celda, i) => (
          <div key={i} className={celda.clase}>
            {celda.valor}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Línea horizontal (como la raya antes del resultado en una suma) */
export function Regla() {
  return <div className="regla" />
}
