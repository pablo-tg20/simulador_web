// =====================================================================
// components/Vacio.jsx — ESTADO VACÍO
// Lo que se ve antes de convertir/calcular: 4 bits flotando y un texto.
// =====================================================================

// Props:
//   digitos  -> los 4 dígitos decorativos (ej. "0110")
//   children -> el texto de ayuda
function Vacio({ digitos = '0110', children }) {
  return (
    <div className="vacio">
      <div className="deco" aria-hidden="true">
        {[...digitos].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <p>{children}</p>
    </div>
  )
}

export default Vacio
