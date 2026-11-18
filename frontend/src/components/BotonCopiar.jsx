// =====================================================================
// components/BotonCopiar.jsx — BOTÓN "COPIAR"
// Copia un texto al portapapeles y muestra "¡Copiado!" durante 1.5 s.
// =====================================================================

import { useEffect, useRef, useState } from 'react'

// Props:
//   texto -> lo que se copia al hacer clic
function BotonCopiar({ texto }) {
  const [etiqueta, setEtiqueta] = useState('Copiar')
  const temporizador = useRef(null) // useRef guarda un valor sin volver a dibujar

  // Al desmontar el componente se cancela el temporizador pendiente
  useEffect(() => () => clearTimeout(temporizador.current), [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setEtiqueta('¡Copiado!')
    } catch {
      setEtiqueta('No se pudo copiar') // ej. el navegador no dio permiso
    }
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setEtiqueta('Copiar'), 1500)
  }

  return (
    <button className="sec" type="button" onClick={copiar}>
      {etiqueta}
    </button>
  )
}

export default BotonCopiar
