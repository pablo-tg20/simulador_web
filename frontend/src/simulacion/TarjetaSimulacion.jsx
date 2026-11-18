// =====================================================================
// simulacion/TarjetaSimulacion.jsx — "RESULTADO Y SIMULACIÓN"
// Muestra el resultado de la operación y la reproduce paso a paso:
// botones ⏮ ◀ ▶ ▶▶, barra de progreso, velocidad, etapas y confeti al final.
//
// La simulación entera depende de UN número: k (el paso actual).
// Cambiar k → React vuelve a dibujar la pizarra como se ve en ese paso.
// =====================================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import BotonCopiar from '../components/BotonCopiar'
import Vacio from '../components/Vacio'
import { PIZARRAS, construirLineaTiempo } from './lineaTiempo'

const ICONO_PLAY = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M8 5l11 7-11 7z" fill="currentColor" />
  </svg>
)
const ICONO_PAUSA = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
  </svg>
)
const COLORES_CONFETI = ['#ff6b6b', '#ffb84c', '#34d399', '#60a5fa', '#a78bfa', '#f472b6']

/** Tamaño de los bits del resultado: más bits → celdas más pequeñas */
function anchoResultado(n) {
  const tope = window.innerWidth <= 900 ? 34 : 46
  const ancho = n <= 10 ? 46 : n <= 18 ? 34 : n <= 32 ? 24 : n <= 48 ? 18 : 14
  return Math.min(ancho, tope)
}

/** Desplaza el escenario (si hace falta) para que `nodo` quede a la vista */
function verEnEscenario(caja, nodo) {
  if (!caja || !nodo) return
  const r = nodo.getBoundingClientRect()
  const c = caja.getBoundingClientRect()
  if (r.bottom > c.bottom - 8) caja.scrollTop += r.bottom - c.bottom + 20
  else if (r.top < c.top + 8) caja.scrollTop -= c.top - r.top + 20
}

// Props:
//   resultado  -> objeto "resultado" del backend, o null si aún no se calcula
//   activa     -> false cuando el usuario está en otra sección (se pausa)
//   tarjetaRef -> referencia a la tarjeta (para bajar hasta ella en celular)
function TarjetaSimulacion({ resultado, activa, tarjetaRef }) {
  const [auto, setAuto] = useState(true)              // "Reproducir solo"
  const [velocidad, setVelocidad] = useState(950)     // milisegundos entre pasos
  const [kGuardado, setK] = useState(0)               // paso actual
  const [reproduciendo, setReproduciendo] = useState(false)
  const [confeti, setConfeti] = useState(null)        // piezas de confeti (o null)
  const [anchoEscenario, setAnchoEscenario] = useState(600)
  const escenarioRef = useRef(null)
  const autoRef = useRef(auto)
  autoRef.current = auto

  // ---- Línea de tiempo: se arma UNA vez por cada resultado nuevo (useMemo)
  const { linea, fallo } = useMemo(() => {
    if (!resultado) return { linea: null, fallo: false }
    try {
      return { linea: construirLineaTiempo(resultado), fallo: false }
    } catch (error) {
      // Si falla la animación, el resultado sigue siendo válido
      console.error('No se pudo construir la simulación:', error)
      return { linea: null, fallo: true }
    }
  }, [resultado])

  // Identificador de cada resultado nuevo: sirve como "key" para que React
  // vuelva a crear (y a animar) el resultado y la pizarra desde cero.
  const claveResultado = useMemo(() => Math.random().toString(36).slice(2), [resultado])

  const total = linea?.total ?? 0
  // Por seguridad, k nunca se sale del rango del resultado actual
  const k = linea ? Math.min(kGuardado, total - 1) : 0
  const [etapa, pasoLocal] = linea ? linea.ubicar(k) : [0, 0]
  const ultimo = linea !== null && k >= total - 1

  // ---- Al llegar un resultado nuevo: empezar desde 0 (y reproducir) o mostrar el final.
  // useLayoutEffect corre ANTES de pintar la pantalla, así no se ve un paso equivocado.
  useLayoutEffect(() => {
    if (!linea) {
      setK(0)
      setReproduciendo(false)
      return
    }
    if (autoRef.current) {
      setK(0)
      setReproduciendo(true)
    } else {
      setK(linea.total - 1)
      setReproduciendo(false)
    }
  }, [linea])

  // ---- Reproducción automática: cada "velocidad" ms avanza un paso
  useEffect(() => {
    if (!reproduciendo || !linea) return undefined
    const temporizador = setTimeout(() => {
      const siguiente = Math.min(k + 1, linea.total - 1)
      setK(siguiente)
      if (siguiente >= linea.total - 1) {
        setReproduciendo(false)
        lanzarConfeti()
      }
    }, velocidad)
    return () => clearTimeout(temporizador) // si cambia algo antes de tiempo, se cancela
  }, [reproduciendo, k, velocidad, linea])

  // ---- Si el usuario se va a otra sección, se pausa
  useEffect(() => {
    if (!activa) setReproduciendo(false)
  }, [activa])

  // ---- Medir el ancho del escenario (para calcular el tamaño de los bits)
  useLayoutEffect(() => {
    const caja = escenarioRef.current
    if (!caja) return undefined
    const medir = () => setAnchoEscenario(caja.clientWidth || 600)
    medir()
    const observador = new ResizeObserver(medir) // vuelve a medir si cambia el tamaño de la ventana
    observador.observe(caja)
    return () => observador.disconnect()
  }, [])

  // ---- Al cambiar de etapa, el escenario vuelve arriba
  useLayoutEffect(() => {
    if (escenarioRef.current) escenarioRef.current.scrollTop = 0
  }, [etapa, linea])

  // ---- Después de dibujar cada paso, mostrar la celda importante (división larga)
  useEffect(() => {
    const caja = escenarioRef.current
    verEnEscenario(caja, caja?.querySelector('[data-foco]'))
  }, [k, linea])

  // ---- Quitar el confeti después de la animación
  useEffect(() => {
    if (!confeti) return undefined
    const t = setTimeout(() => setConfeti(null), 2600)
    return () => clearTimeout(t)
  }, [confeti])

  function lanzarConfeti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setConfeti({
      id: Date.now(),
      piezas: Array.from({ length: 34 }, (_, i) => ({
        left: `${10 + Math.random() * 80}%`,
        background: COLORES_CONFETI[i % COLORES_CONFETI.length],
        animationDelay: `${Math.random() * 0.35}s`,
        '--dx': `${(Math.random() - 0.5) * 220}px`,
      })),
    })
  }

  // ---- Controles
  function irAPaso(paso, celebrar = false) {
    if (!linea) return
    const limitado = Math.max(0, Math.min(linea.total - 1, paso))
    setK(limitado)
    if (celebrar && limitado === linea.total - 1) lanzarConfeti()
  }
  function pausar() {
    setReproduciendo(false)
  }
  function reproducir() {
    if (!linea) return
    if (k >= linea.total - 1) setK(0) // si ya terminó, empieza de nuevo
    setReproduciendo(true)
  }

  const Pizarra = linea ? PIZARRAS[linea.modelos[etapa].tipo] : null

  return (
    <section className="tarjeta simulacion" ref={tarjetaRef}>
      <div className="cab">
        <h2>Resultado y simulación</h2>
        <label className="interruptor">
          <input type="checkbox" id="auto" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span className="pista" /> Reproducir solo
        </label>
      </div>

      {/* Resultado (aparece al calcular) */}
      {resultado && <BandaResultado key={claveResultado} res={resultado} />}

      {/* Etapas: con 3 o más números se resuelve de dos en dos */}
      {linea && linea.modelos.length > 1 && (
        <div className="etapas">
          {resultado.etapas.map((e, i) => (
            <button
              key={i}
              type="button"
              className={`etapa${i === etapa ? ' actual' : ''}`}
              onClick={() => {
                pausar()
                irAPaso(linea.inicios[i])
              }}
            >
              <b>{i + 1}</b>
              <span>
                {e.a} {resultado.simbolo} {e.b} = {e.resultado}
                {e.residuo !== null ? ` r ${e.residuo}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="escenario" ref={escenarioRef}>
        {linea ? (
          // key: al cambiar de etapa (o de resultado) React crea una pizarra nueva, desde cero
          <Pizarra key={`${claveResultado}-${etapa}`} modelo={linea.modelos[etapa]} k={pasoLocal} anchoEscenario={anchoEscenario} />
        ) : fallo ? (
          <p className="vacio-texto">No se pudo animar esta operación, pero el resultado es correcto.</p>
        ) : (
          <Vacio digitos="0110">
            Elige una operación, escribe de 2 a 6 números
            <br />y pulsa <b>Calcular</b>: aquí verás cómo
            <br />
            se construye el resultado, bit por bit.
          </Vacio>
        )}
      </div>

      <p className="leyenda">{linea ? linea.leyenda(k) : 'Cuando calcules, cada paso se explicará aquí.'}</p>

      <div className="controles">
        <button
          className="icono"
          type="button"
          title="Volver al inicio"
          aria-label="Volver al inicio"
          disabled={!linea || k === 0}
          onClick={() => {
            pausar()
            irAPaso(0)
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 5v14M19 5L9 12l10 7z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="icono"
          type="button"
          title="Paso anterior"
          aria-label="Paso anterior"
          disabled={!linea || k === 0}
          onClick={() => {
            pausar()
            irAPaso(k - 1)
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M15 5l-8 7 8 7z" fill="currentColor" />
          </svg>
        </button>
        <button
          className="primario redondo"
          type="button"
          title="Reproducir / pausar"
          aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
          disabled={!linea}
          onClick={() => (reproduciendo ? pausar() : reproducir())}
        >
          {reproduciendo ? ICONO_PAUSA : ICONO_PLAY}
        </button>
        <button
          className="icono"
          type="button"
          title="Paso siguiente"
          aria-label="Paso siguiente"
          disabled={!linea || ultimo}
          onClick={() => {
            pausar()
            irAPaso(k + 1, true)
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M9 5l8 7-8 7z" fill="currentColor" />
          </svg>
        </button>
        <input
          type="range"
          id="barra"
          min="0"
          max={Math.max(0, total - 1)}
          value={k}
          aria-label="Paso actual"
          disabled={!linea}
          onChange={(e) => {
            pausar()
            irAPaso(Number(e.target.value))
          }}
        />
        <span className="contador">{linea ? `Paso ${k + 1} de ${total}` : '—'}</span>
        <select id="velocidad" aria-label="Velocidad" value={velocidad} onChange={(e) => setVelocidad(Number(e.target.value))}>
          <option value={1500}>Lento</option>
          <option value={950}>Normal</option>
          <option value={450}>Rápido</option>
        </select>
      </div>

      {/* Confeti al terminar la simulación */}
      {confeti && (
        <div className="confeti" key={confeti.id} aria-hidden="true">
          {confeti.piezas.map((estilo, i) => (
            <i key={i} style={estilo} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Franja con el resultado final, el residuo, la ecuación en decimal y "Copiar" */
function BandaResultado({ res }) {
  const expresion = res.numeros_dec.join(` ${res.simbolo} `)
  const ecuacion = res.residuo !== null
    ? `${expresion} = ${res.res_dec}, residuo ${res.residuo_dec}  (en decimal)`
    : `${expresion} = ${res.res_dec}  (en decimal)`

  return (
    <div className="banda">
      <div className="banda-bits">
        <span className="etq">Resultado</span>
        <div className="bits" id="resultado-bits" style={{ '--w': `${anchoResultado(res.resultado.length)}px` }}>
          {[...res.resultado].map((c, i) => (
            <div key={i} className={c === '1' || c === '-' ? 'bit uno' : 'bit'} style={{ '--i': Math.min(i, 20) }}>
              {c === '-' ? '−' : c}
            </div>
          ))}
        </div>
        {res.residuo !== null && (
          <div className="residuo">
            <span>residuo</span>
            <div className="bits">
              {[...res.residuo].map((c, i) => (
                <div key={i} className={c === '1' ? 'bit uno' : 'bit'}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="banda-info">
        <span className={`insignia${res.verificado ? '' : ' mal'}`}>
          {res.verificado ? '✔ Verificado en decimal' : '✖ No coincide con el decimal'}
        </span>
        <p className="ecuacion">{ecuacion}</p>
        <BotonCopiar texto={res.resultado} />
      </div>
    </div>
  )
}

export default TarjetaSimulacion
