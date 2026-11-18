// =====================================================================
// secciones/SeccionAritmetica.jsx — ARITMÉTICA BINARIA (2 a 6 números)
// Izquierda: calculadora + historial. Derecha: resultado y simulación.
// El cálculo lo hace el backend (POST /api/calcular → logica_binaria.py).
// =====================================================================

import { useEffect, useRef, useState } from 'react'
import { VistaPreviaBits } from '../components/Bit'
import Selector from '../components/Selector'
import {
  COLORES_OPERACION,
  EJEMPLOS_ARITMETICA,
  LETRAS,
  PLACEHOLDERS_ARITMETICA,
  rolesPara,
} from '../data/constantes'
import { useHistorial } from '../hooks/useHistorial'
import { ErrorConexion, calcular } from '../services/api'
import TarjetaSimulacion from '../simulacion/TarjetaSimulacion'

const sinEspacios = (texto) => texto.replace(/\s/g, '')
const esBinario = (texto) => /^[01]+$/.test(texto)

// Props:
//   activa      -> true si esta sección se está viendo
//   operaciones -> lista [{clave, nombre, simbolo}] (del backend)
//   maxNumeros  -> máximo de números (6)
//   carga       -> petición externa (desde Pruebas): { operacion, numeros, id }
//   onConexion  -> avisa a App si el servidor respondió (true) o no (false)
function SeccionAritmetica({ activa, operaciones, maxNumeros, carga, onConexion }) {
  const [operacion, setOperacion] = useState('suma')
  const [numeros, setNumeros] = useState(['', ''])
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)        // { mensaje, id } (id reinicia la animación)
  const [enCurso, setEnCurso] = useState(false)
  const { historial, agregar, borrar } = useHistorial('simulador-binario-historial', 20)

  const enCursoRef = useRef(false)                 // evita mandar dos cálculos a la vez
  const entradasRef = useRef([])                   // referencias a los <input> (para enfocar)
  const enfocarRef = useRef(null)                  // índice del input que se debe enfocar
  const tarjetaRef = useRef(null)

  const op = operaciones.find((o) => o.clave === operacion) ?? operaciones[0]
  const roles = rolesPara(operacion, numeros.length)

  // El CSS cambia los colores según <body data-op="...">
  useEffect(() => {
    document.body.dataset.op = operacion
  }, [operacion])

  // Enfocar un campo después de agregar/limpiar
  useEffect(() => {
    if (enfocarRef.current !== null) {
      entradasRef.current[enfocarRef.current]?.focus()
      enfocarRef.current = null
    }
  }, [numeros])

  // ------------------------------------------------------------------
  // Enviar el cálculo al backend
  // ------------------------------------------------------------------
  async function enviarCalculo(opEnviar = operacion, numerosEnviar = numeros) {
    if (enCursoRef.current) return
    enCursoRef.current = true
    setEnCurso(true)
    setError(null)
    try {
      // (a) Petición: { operacion, numeros } → (b) FastAPI → (c) logica_binaria.calcular()
      const res = await calcular(opEnviar, numerosEnviar)
      onConexion(true)
      setResultado(res) // (d) dibujar
      agregar({
        operacion: res.operacion,
        simbolo: res.simbolo,
        numeros: res.numeros,
        resultado: res.resultado,
        residuo: res.residuo,
      })
      if (window.innerWidth <= 980) {
        tarjetaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) // en celular, bajar
      }
    } catch (e) {
      onConexion(!(e instanceof ErrorConexion))
      setError({ mensaje: e.message, id: Date.now() })
    } finally {
      enCursoRef.current = false
      setEnCurso(false)
    }
  }

  // Cargar una operación (ejemplo, historial o prueba) y calcularla
  function cargarOperacion(nuevaOperacion, nuevosNumeros) {
    setOperacion(nuevaOperacion)
    setNumeros(nuevosNumeros)
    enviarCalculo(nuevaOperacion, nuevosNumeros)
  }

  // Petición que llega desde la sección Pruebas
  useEffect(() => {
    if (carga) cargarOperacion(carga.operacion, carga.numeros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carga?.id])

  // ------------------------------------------------------------------
  // Botones
  // ------------------------------------------------------------------
  function limpiar() {
    enfocarRef.current = 0
    setNumeros(['', ''])
    setError(null)
    setResultado(null)
  }

  // Esc limpia la calculadora (solo si esta sección está a la vista)
  useEffect(() => {
    if (!activa) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape') limpiar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [activa])

  function cambiarNumero(i, valor) {
    setNumeros((anterior) => anterior.map((n, j) => (j === i ? valor : n)))
  }
  function agregarNumero() {
    if (numeros.length >= maxNumeros) return
    enfocarRef.current = numeros.length
    setNumeros([...numeros, ''])
  }
  function quitarNumero(i) {
    if (numeros.length <= 2) return
    setNumeros(numeros.filter((_, j) => j !== i))
  }

  return (
    <main className="rejilla" hidden={!activa}>
      {/* ---------- Izquierda: calculadora + historial ---------- */}
      <div className="col">
        <section className="tarjeta calculadora">
          <h2>
            <b>1</b> ¿Qué quieres hacer?
          </h2>
          <Selector etiqueta="Operación" opciones={operaciones} valor={operacion} onCambiar={setOperacion} />

          <h2>
            <b>2</b> Escribe los números{' '}
            <span className="sub">
              ({numeros.length} de {maxNumeros})
            </span>
          </h2>

          {/* Un campo por número, con el símbolo de la operación entre ellos */}
          <div>
            {numeros.map((valor, i) => {
              const limpio = sinEspacios(valor)
              const valido = limpio !== '' && esBinario(limpio)
              return (
                <div key={i}>
                  {i > 0 && (
                    <div className="operador">
                      {/* key: al cambiar de operación el símbolo se vuelve a crear y "salta" */}
                      <span key={operacion} className="pop">
                        {op?.simbolo}
                      </span>
                    </div>
                  )}
                  <div className="campo">
                    <label htmlFor={`entrada-${i}`}>
                      <span className="rol">
                        <i className="letra">{LETRAS[i]}</i>
                        <span className="rol-nombre">{roles[i].nombre}</span>
                      </span>
                      <span className="decimal">
                        {valido ? `= ${BigInt(`0b${limpio}`).toString()} en decimal` : ''}
                      </span>
                      {numeros.length > 2 && (
                        <button
                          className="quitar"
                          type="button"
                          title={`Quitar el número ${LETRAS[i]}`}
                          aria-label={`Quitar el número ${LETRAS[i]}`}
                          onClick={() => quitarNumero(i)}
                        >
                          ×
                        </button>
                      )}
                    </label>
                    <input
                      ref={(nodo) => {
                        entradasRef.current[i] = nodo
                      }}
                      className={`entrada${limpio === '' ? '' : valido ? ' valida' : ' invalida'}`}
                      id={`entrada-${i}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={80}
                      placeholder={PLACEHOLDERS_ARITMETICA[i]}
                      aria-label={`Número ${LETRAS[i]} en binario`}
                      value={valor}
                      onChange={(e) => cambiarNumero(i, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enviarCalculo()}
                    />
                    <span className="ayuda">{roles[i].ayuda}</span>
                    <VistaPreviaBits texto={limpio} />
                  </div>
                </div>
              )
            })}
          </div>

          <button className="agregar" type="button" disabled={numeros.length >= maxNumeros} onClick={agregarNumero}>
            {numeros.length >= maxNumeros ? `Máximo ${maxNumeros} números` : '+ Agregar otro número'}
          </button>

          <p className="frase">
            <Frase numeros={numeros} operacion={operacion} simbolo={op?.simbolo ?? '+'} />
          </p>
          {error && (
            <p className="error" role="alert" key={error.id}>
              {error.mensaje}
            </p>
          )}

          <div className="acciones">
            <button className={`primario${enCurso ? ' cargando' : ''}`} type="button" onClick={() => enviarCalculo()}>
              Calcular
            </button>
            <button
              className="sec"
              type="button"
              title="Invertir el orden de los números"
              aria-label="Invertir el orden de los números"
              onClick={() => setNumeros([...numeros].reverse())}
            >
              ⇄
            </button>
            <button className="sec" type="button" onClick={limpiar}>
              Limpiar
            </button>
          </div>

          <div className="ejemplos">
            <span>Prueba con</span>
            {EJEMPLOS_ARITMETICA.map((ej) => {
              const simbolo = operaciones.find((o) => o.clave === ej.operacion)?.simbolo
              const texto = ej.numeros.join(` ${simbolo} `)
              return (
                <button
                  key={`${ej.operacion}-${texto}`}
                  className="chip"
                  type="button"
                  data-op={ej.operacion}
                  onClick={() => cargarOperacion(ej.operacion, ej.numeros)}
                >
                  {texto}
                </button>
              )
            })}
          </div>
        </section>

        <section className="tarjeta historial">
          <div className="cab">
            <h2>Historial</h2>
            <button className="enlace-texto" type="button" onClick={borrar}>
              Borrar
            </button>
          </div>
          <ul className="lista">
            {historial.length === 0 ? (
              <li className="vacio-texto">Tus operaciones aparecerán aquí. Haz clic en una para repetirla.</li>
            ) : (
              historial.map((h, i) => {
                const nums = h.numeros || [h.a, h.b] // compatibilidad con historiales viejos
                return (
                  <li key={i}>
                    <button type="button" onClick={() => cargarOperacion(h.operacion, nums)}>
                      <span className="sello" style={{ background: COLORES_OPERACION[h.operacion] || '#999' }}>
                        {h.simbolo}
                      </span>
                      <span className="op-texto">{nums.join(` ${h.simbolo} `)}</span>
                      <span className="res">
                        = {h.resultado}
                        {h.residuo !== null && h.residuo !== undefined ? `  (r ${h.residuo})` : ''}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </section>
      </div>

      {/* ---------- Derecha: resultado + simulación ---------- */}
      <div className="col">
        <TarjetaSimulacion resultado={resultado} activa={activa} tarjetaRef={tarjetaRef} />
      </div>
    </main>
  )
}

/** Frase en palabras normales: "a 15 le quitas 3, luego 5"... (solo visual) */
function Frase({ numeros, operacion, simbolo }) {
  const textos = numeros.map(sinEspacios)
  if (!textos.every(esBinario)) {
    return 'Escribe todos los números en binario y aquí te explico, en palabras normales, qué se va a calcular.'
  }
  const v = textos.map((t) => BigInt(`0b${t}`)) // BigInt: enteros sin límite de tamaño
  const expr = <b>{v.join(` ${simbolo} `)}</b>
  const resto = v.slice(1).join(', luego ')

  let texto
  if (operacion === 'suma') {
    texto = <>: juntas {v.length === 2 ? 'las dos' : `las ${v.length}`} cantidades.</>
  } else if (operacion === 'resta') {
    const total = v.slice(1).reduce((a, x) => a + x, 0n)
    texto = <>: a {v[0].toString()} le quitas {resto}.{total > v[0] ? ' El resultado será negativo.' : ''}</>
  } else if (operacion === 'multiplicacion') {
    texto = <>: multiplicas {v[0].toString()} por {resto}.</>
  } else {
    texto = v.slice(1).some((x) => x === 0n)
      ? <>: no se puede dividir entre 0.</>
      : (
        <>
          : divides {v[0].toString()} entre {v[1].toString()}
          {v.length > 2 ? ` y el cociente entre ${v.slice(2).join(', luego ')}` : ''}.
        </>
      )
  }
  return (
    <>
      En decimal → {expr}
      {texto}
      {v.length > 2 && (
        <>
          {' '}Se resuelve en <b>{v.length - 1} etapas</b>, de izquierda a derecha.
        </>
      )}
    </>
  )
}

export default SeccionAritmetica
