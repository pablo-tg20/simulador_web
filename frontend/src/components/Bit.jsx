// =====================================================================
// components/Bit.jsx — UN BIT (la pieza visual principal)
// Dibuja una cajita con 0 o 1. Los "1" se pintan con el degradado del tema.
// El tamaño se controla con la variable CSS --w del contenedor.
// =====================================================================

/**
 * Arma las clases CSS de un bit. Ej. claseBit("1", "nuevo") → "bit uno nuevo"
 * @param {string} valor - "0", "1", "−", "" ...
 * @param {string} [extra] - clases adicionales: "relleno", "activa", "nuevo"...
 */
export function claseBit(valor, extra = '') {
  return `bit${valor === '1' ? ' uno' : ''}${extra ? ` ${extra}` : ''}`
}

// Props:
//   valor  -> el texto de la cajita ("0" o "1")
//   extra  -> clases adicionales (opcional)
//   clase  -> si se pasa, REEMPLAZA las clases calculadas (para casos especiales)
//   estilo -> estilos en línea (ej. { '--i': 3 } para el retraso de la animación)
function Bit({ valor, extra = '', clase, estilo, ...resto }) {
  return (
    <div className={clase ?? claseBit(valor, extra)} style={estilo} {...resto}>
      {valor}
    </div>
  )
}

/**
 * Fila de bits a partir de un texto: "1011" → 4 cajitas.
 * Props: bits (texto), extra (función opcional (caracter, i) → clases extra)
 */
export function FilaBits({ bits, extra }) {
  return [...bits].map((c, i) => <Bit key={i} valor={c} extra={extra ? extra(c, i) : ''} />)
}

/**
 * Vista previa mientras se escribe: cada carácter como bit; los que no son 0/1 en rojo.
 * Muestra máximo 40 y luego "+N bits".
 */
export function VistaPreviaBits({ texto }) {
  const MOSTRAR = 40
  if (texto === '') return null
  return (
    <div className="vista" aria-hidden="true">
      {[...texto].slice(0, MOSTRAR).map((c, i) => (
        <div key={i} className={c === '1' ? 'bit uno' : c === '0' ? 'bit' : 'bit malo'}>
          {c}
        </div>
      ))}
      {texto.length > MOSTRAR && <span className="mas">+{texto.length - MOSTRAR} bits</span>}
    </div>
  )
}

export default Bit
