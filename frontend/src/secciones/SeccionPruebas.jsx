// =====================================================================
// secciones/SeccionPruebas.jsx — PRUEBAS PARA LA DEMOSTRACIÓN
// Ejecuta en el backend los casos de la rúbrica (GET /api/pruebas → pruebas.py)
// y los muestra en una tabla. Al tocar una fila se abre en su sección.
// =====================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { GRUPOS_PRUEBA } from '../data/constantes'
import { ErrorConexion, ejecutarPruebas } from '../services/api'

// Props:
//   activa     -> true si esta sección se está viendo
//   conectado  -> true cuando el servidor respondió (se ejecutan solas la primera vez)
//   onAbrir    -> función que recibe una fila y la abre en su sección
//   onConexion -> avisa a App si el servidor respondió (true) o no (false)
function SeccionPruebas({ activa, conectado, onAbrir, onConexion }) {
  const [filas, setFilas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const cargandoRef = useRef(false)

  const ejecutar = useCallback(async () => {
    if (cargandoRef.current) return
    cargandoRef.current = true
    setCargando(true)
    try {
      setFilas(await ejecutarPruebas())
      setFallo(false)
      onConexion(true)
    } catch (e) {
      setFallo(true)
      onConexion(!(e instanceof ErrorConexion))
    } finally {
      cargandoRef.current = false
      setCargando(false)
    }
  }, [onConexion])

  // Si el servidor vuelve a estar disponible, se permite un nuevo intento automático
  useEffect(() => {
    if (conectado) setFallo(false)
  }, [conectado])

  // La primera vez que se abre la sección (con el servidor encendido), se ejecutan solas
  useEffect(() => {
    if (activa && conectado && filas === null && !fallo) ejecutar()
  }, [activa, conectado, filas, fallo, ejecutar])

  const correctas = filas?.filter((f) => f.ok).length ?? 0
  const todas = filas !== null && correctas === filas.length

  return (
    <main className="rejilla una" hidden={!activa}>
      <section className="tarjeta pruebas">
        <div className="cab">
          <h2>Pruebas para la demostración</h2>
          <button className={`primario${cargando ? ' cargando' : ''}`} type="button" onClick={ejecutar}>
            Ejecutar pruebas
          </button>
        </div>
        <p className="sub">
          Casos sugeridos en la rúbrica, casos extra y validaciones de datos incorrectos. Se ejecutan en el servidor
          (pruebas.py). Toca una fila para abrirla en su sección.
        </p>

        {filas && (
          <span className={`insignia${todas ? '' : ' mal'}`} id="resumen-pruebas">
            {todas ? '✔' : '✖'} {correctas} de {filas.length} pruebas correctas
          </span>
        )}

        <div className="tabla-pruebas">
          {fallo && !filas ? (
            <p className="vacio-texto">No se pudieron ejecutar las pruebas: el servidor no responde.</p>
          ) : !filas ? (
            <p className="vacio-texto">{conectado ? 'Ejecutando pruebas…' : 'Esperando al servidor…'}</p>
          ) : (
            <>
              <div className="fila-prueba cab">
                <span>Grupo</span>
                <span>Operación</span>
                <span>Entrada</span>
                <span>Esperado</span>
                <span>Obtenido</span>
                <span />
              </div>
              {filas.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  className={`fila-prueba${f.ok ? '' : ' falla'}`}
                  title="Abrir esta prueba en su sección"
                  style={{ '--i': Math.min(i, 14) }}
                  onClick={() => onAbrir(f)}
                >
                  <span className={`grupo ${f.grupo}`}>{GRUPOS_PRUEBA[f.grupo] || f.grupo}</span>
                  <span className="op">{f.operacion}</span>
                  <code className="dato">{f.entrada}</code>
                  <code className="dato">{f.esperado}</code>
                  <span className="obtenido">
                    <code className="dato">{f.obtenido}</code>
                    {f.mensaje && <small className="motivo">{f.mensaje}</small>}
                  </span>
                  <span className={`marca${f.ok ? '' : ' mal'}`}>{f.ok ? '✔' : '✖'}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default SeccionPruebas
