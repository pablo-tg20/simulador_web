// =====================================================================
// components/Selector.jsx — SELECTOR TIPO "PÍLDORA"
// Una fila de opciones con una pastilla de color que se desliza a la elegida.
// Se usa 3 veces: tipo de conversión numérica, de texto y operación aritmética.
// =====================================================================

// Props:
//   id         -> id del contenedor (el CSS usa #selector-conversion)
//   etiqueta   -> descripción para lectores de pantalla
//   opciones   -> lista de { clave, simbolo, nombre }
//   valor      -> clave de la opción elegida
//   onCambiar  -> función que recibe la clave elegida
function Selector({ id, etiqueta, opciones, valor, onCambiar }) {
  // Posición de la opción elegida (0, 1, 2...) para mover la pastilla
  const indice = Math.max(0, opciones.findIndex((o) => o.clave === valor))

  return (
    <div className="selector" id={id} style={{ '--n': opciones.length }} role="tablist" aria-label={etiqueta}>
      {/* La pastilla de color se desliza con transform (animación en CSS) */}
      <span className="pastilla" style={{ transform: `translateX(${indice * 100}%)` }} />
      {opciones.map((opcion) => (
        <button
          key={opcion.clave}
          className="opcion"
          type="button"
          role="tab"
          aria-selected={opcion.clave === valor}
          onClick={() => onCambiar(opcion.clave)}
        >
          <span className="simbolo">{opcion.simbolo}</span>
          <span className="nombre">{opcion.nombre}</span>
        </button>
      ))}
    </div>
  )
}

export default Selector
