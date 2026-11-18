// =====================================================================
// secciones/SeccionTexto.jsx — TEXTO ↔ CÓDIGO ASCII ↔ BINARIO
// Cada carácter → su código ASCII (decimal) → 8 bits (método de los pesos).
// El cálculo lo hace el backend (POST /api/convertir → conversion_texto.py).
// =====================================================================

import { useEffect, useRef, useState } from 'react'
import Bit, { FilaBits } from '../components/Bit'
import BotonCopiar from '../components/BotonCopiar'
import Selector from '../components/Selector'
import Vacio from '../components/Vacio'
import { MODOS_CONV, TIPOS_CARACTER, plural } from '../data/constantes'
import { ErrorConexion, convertirTexto, obtenerTablaAscii } from '../services/api'

const OPCIONES = Object.entries(MODOS_CONV).map(([clave, m]) => ({ clave, simbolo: m.simbolo, nombre: m.nombre }))

// Props:
//   activa        -> true si esta sección se está viendo
//   conectado     -> true cuando el servidor respondió (para cargar la tabla ASCII)
//   maxCaracteres -> límite de caracteres (100, viene del backend)
//   carga         -> petición externa (desde Pruebas): { modo, texto, id }
//   onConexion    -> avisa a App si el servidor respondió (true) o no (false)
function SeccionTexto({ activa, conectado, maxCaracteres, carga, onConexion }) {
  const [modo, setModo] = useState('texto_a_binario')
  const [texto, setTexto] = useState('')
  const [conversion, setConversion] = useState(null)
  const [seleccion, setSeleccion] = useState(0)  // carácter que se explica en el desglose
  const [error, setError] = useState(null)

  const entradaRef = useRef(null)
  const resultadoRef = useRef(null)
  const temporizador = useRef(null)
  const peticion = useRef(0)

  const cfg = MODOS_CONV[modo]

  useEffect(() => {
    if (activa) entradaRef.current?.focus()
  }, [activa])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  // ------------------------------------------------------------------
  // Pedir la conversión al backend
  // ------------------------------------------------------------------
  async function enviar(textoEnviar = texto, modoEnviar = modo, irAlResultado = false) {
    clearTimeout(temporizador.current)
    setError(null)
    const numero = ++peticion.current
    try {
      const datos = await convertirTexto(modoEnviar, textoEnviar)
      onConexion(true)
      if (numero !== peticion.current) return
      setConversion(datos)
      setSeleccion(0)
      if (irAlResultado && window.innerWidth <= 980) {
        resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (e) {
      onConexion(!(e instanceof ErrorConexion))
      if (numero !== peticion.current) return
      setConversion(null)
      setError({ mensaje: e.message, id: Date.now() })
    }
  }

  function limpiarResultado() {
    peticion.current++
    clearTimeout(temporizador.current)
    setConversion(null)
    setError(null)
  }

  function elegirModo(nuevoModo, nuevoTexto = '') {
    setModo(nuevoModo)
    setTexto(nuevoTexto)
    limpiarResultado()
  }

  // Texto → binario se convierte mientras escribes (250 ms de pausa).
  // Binario → texto solo con el botón o Enter.
  function alEscribir(nuevo) {
    setTexto(nuevo)
    setError(null)
    clearTimeout(temporizador.current)
    if (modo !== 'texto_a_binario') return
    if (nuevo === '') {
      limpiarResultado()
      return
    }
    temporizador.current = setTimeout(() => enviar(nuevo, modo), 250)
  }

  function invertir() {
    const otro = modo === 'texto_a_binario' ? 'binario_a_texto' : 'texto_a_binario'
    const nuevo = conversion ? (modo === 'texto_a_binario' ? conversion.binario : conversion.texto) : ''
    elegirModo(otro, nuevo)
    if (nuevo) enviar(nuevo, otro, true)
  }

  // Tocar una fila de la tabla ASCII: agrega esa letra (o su binario) y convierte
  function usarFilaAscii(fila) {
    const nuevo = modo === 'texto_a_binario'
      ? texto + fila.caracter
      : (texto.trim() ? `${texto.trim()} ` : '') + fila.binario
    setTexto(nuevo)
    enviar(nuevo, modo)
    entradaRef.current?.focus()
  }

  useEffect(() => {
    if (!carga) return
    elegirModo(carga.modo, carga.texto)
    enviar(carga.texto, carga.modo, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carga?.id])

  // ------------------------------------------------------------------
  // Ayuda en vivo (solo visual; la validación real la hace Python)
  // ------------------------------------------------------------------
  let frase
  let claseEntrada = ''
  if (modo === 'texto_a_binario') {
    const n = [...texto].length // [...texto] cuenta caracteres reales (ñ, á, emojis)
    const espacios = [...texto].filter((c) => c === ' ').length
    frase = n === 0 ? (
      <>Cada carácter ocupa <b>8 bits</b>, incluidos los espacios. Escribe algo y aquí verás cuántos bits son.</>
    ) : (
      <>
        <b>{n}</b> {plural(n, 'carácter', 'caracteres')} × 8 = <b>{n * 8} bits</b>
        {espacios ? ` (${espacios} ${plural(espacios, 'espacio')} ${plural(espacios, 'incluido')}).` : '.'}
      </>
    )
  } else {
    const grupos = texto.trim().split(/\s+/).filter(Boolean)
    const bits = grupos.join('').length
    if (bits === 0) {
      frase = <>Escribe los <b>8 bits</b> de cada letra. Los espacios solo sirven para separar una letra de otra.</>
    } else if (/[^01\s]/.test(texto)) {
      claseEntrada = ' invalida'
      frase = <>Solo se permiten <b>0</b> y <b>1</b> (y espacios para separar).</>
    } else {
      claseEntrada = ' valida'
      frase = (
        <>
          <b>{bits}</b> bits en <b>{grupos.length}</b> {plural(grupos.length, 'grupo')}.
        </>
      )
    }
  }

  // Notas sobre ASCII extendido y grupos incompletos
  const notas = []
  if (conversion?.hay_extendidos) {
    notas.push(
      'Las letras como ñ o á no están en el ASCII estándar (0–127): se usa el ASCII extendido Latin-1 (128–255), ' +
        'que también cabe en 8 bits. Por ejemplo ñ = 241 = 11110001.',
    )
  }
  if (conversion?.relleno) notas.push('Algunos grupos tenían menos de 8 bits: se completaron con ceros a la izquierda.')

  const n = conversion?.caracteres.length ?? 0
  const salida = conversion ? (conversion.modo === 'texto_a_binario' ? conversion.binario : conversion.texto) : ''

  return (
    <main className="rejilla" hidden={!activa}>
      <div className="col">
        <section className="tarjeta conversor">
          <h2>
            <b>1</b> ¿Qué quieres convertir?
          </h2>
          <Selector
            id="selector-conversion"
            etiqueta="Tipo de conversión"
            opciones={OPCIONES}
            valor={modo}
            onCambiar={(m) => {
              elegirModo(m)
              entradaRef.current?.focus()
            }}
          />

          <h2>
            <b>2</b> <span>{cfg.titulo}</span>
          </h2>
          <div className="campo">
            <input
              ref={entradaRef}
              className={`entrada entrada-texto${claseEntrada}`}
              type="text"
              autoComplete="off"
              spellCheck="false"
              maxLength={modo === 'texto_a_binario' ? maxCaracteres : maxCaracteres * 9}
              placeholder={cfg.placeholder}
              aria-label="Texto a convertir"
              value={texto}
              onChange={(e) => alEscribir(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar(texto, modo, true)}
            />
            <span className="ayuda">{cfg.ayuda}</span>
          </div>

          <p className="frase">{frase}</p>
          {error && (
            <p className="error" role="alert" key={error.id}>
              {error.mensaje}
            </p>
          )}

          <div className="acciones">
            <button className="primario" type="button" onClick={() => enviar(texto, modo, true)}>
              Convertir
            </button>
            <button
              className="sec"
              type="button"
              title="Usar el resultado como entrada de la conversión contraria"
              aria-label="Invertir conversión"
              onClick={invertir}
            >
              ⇄
            </button>
            <button
              className="sec"
              type="button"
              onClick={() => {
                setTexto('')
                limpiarResultado()
                entradaRef.current?.focus()
              }}
            >
              Limpiar
            </button>
          </div>

          <div className="ejemplos">
            <span>Prueba con</span>
            {cfg.ejemplos.map((ej) => (
              <button
                key={ej.etiqueta}
                className="chip conv"
                type="button"
                onClick={() => {
                  setTexto(ej.valor)
                  enviar(ej.valor, modo, true)
                }}
              >
                {ej.etiqueta}
              </button>
            ))}
          </div>
        </section>

        <TablaAscii activa={activa} conectado={conectado} onUsar={usarFilaAscii} />
      </div>

      <div className="col">
        <section className="tarjeta resultado-texto" ref={resultadoRef}>
          <div className="cab">
            <h2>Resultado</h2>
            <span className="contador">
              {conversion ? `${n} ${plural(n, 'carácter', 'caracteres')} · ${n * 8} bits` : ''}
            </span>
          </div>

          {conversion && (
            <div className="banda banda-texto">
              <div className="banda-bits">
                <span className="etq">Código ASCII (decimal)</span>
                <div className="salida ascii">{conversion.ascii}</div>
                <span className="etq">{MODOS_CONV[conversion.modo].salida}</span>
                <div className={`salida${conversion.modo === 'binario_a_texto' ? ' texto' : ''}`}>{salida}</div>
              </div>
              <BotonCopiar texto={salida} />
            </div>
          )}
          {notas.length > 0 && <p className="nota">{notas.join(' ')}</p>}

          {conversion && conversion.caracteres[seleccion] && (
            <Desglose
              key={`${conversion.entrada}-${seleccion}`}
              ch={conversion.caracteres[seleccion]}
              alReves={conversion.modo === 'binario_a_texto'}
            />
          )}

          <div className="tabla-conv">
            {!conversion ? (
              <Vacio digitos="0101">
                Escribe una letra, una palabra o una frase:
                <br />
                aquí verás cada letra con su <b>código ASCII</b>
                <br />y sus <b>8 bits</b>.
              </Vacio>
            ) : (
              <>
                <div className="fila-conv cab">
                  <span>Letra</span>
                  <span>ASCII</span>
                  <span>Binario (8 bits)</span>
                </div>
                {conversion.caracteres.map((ch, i) => (
                  <button
                    key={`${conversion.entrada}-${i}`}
                    type="button"
                    className={`fila-conv${i === seleccion ? ' sel' : ''}`}
                    style={{ '--i': Math.min(i, 14) }}
                    onClick={() => setSeleccion(i)}
                  >
                    <span className={ch.tipo === 'espacio' ? 'c-letra esp' : 'c-letra'}>
                      {ch.tipo === 'espacio' ? '␣ espacio' : ch.visible}
                    </span>
                    <span className="c-dec">{ch.decimal}</span>
                    <span className="c-bits">
                      <FilaBits bits={ch.binario} />
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

/** Panel del "por qué": cada peso (128, 64, 32…) y su bit para UN carácter */
function Desglose({ ch, alReves }) {
  const nombre = ch.tipo === 'espacio' ? 'el espacio' : `«${ch.caracter}»`
  const encendidos = ch.desglose.filter((p) => p.bit === 1).map((p) => p.peso)

  return (
    <div className="desglose">
      <div className="cabeza">
        <div className={ch.tipo === 'espacio' ? 'grande espacio' : 'grande'}>{ch.visible}</div>
        <p>
          {alReves ? (
            <>
              El byte <b>{ch.binario}</b> vale <b>{ch.decimal}</b>, y ese número es la letra {nombre}.
            </>
          ) : (
            <>
              {nombre[0].toUpperCase() + nombre.slice(1)} tiene el código ASCII <b>{ch.decimal}</b>, que en 8 bits se
              escribe <b>{ch.binario}</b>.
            </>
          )}
          <span className="etiqueta-tipo">{TIPOS_CARACTER[ch.tipo] || ''}</span>
        </p>
      </div>

      {/* Cuadrícula de 3 filas: peso / bit / queda (o suma) */}
      <div className="pesos">
        <span className="rot">peso</span>
        {ch.desglose.map((p) => (
          <span key={`p${p.peso}`} className="peso">
            {p.peso}
          </span>
        ))}
        <span className="rot">bit</span>
        {ch.desglose.map((p) => (
          <Bit key={`b${p.peso}`} valor={String(p.bit)} />
        ))}
        <span className="rot">{alReves ? 'suma' : 'queda'}</span>
        {ch.desglose.map((p) => (
          <span key={`q${p.peso}`} className={`queda${p.bit ? ' on' : ' cero'}`}>
            {alReves ? p.suma : p.queda}
          </span>
        ))}
      </div>

      <div className="suma">
        {alReves ? `${encendidos.join(' + ')} = ${ch.decimal}` : `${ch.decimal} = ${encendidos.join(' + ')}`}
      </div>
      <p className="como">
        {alReves ? (
          <>
            Cada <b>1</b> suma el peso de su posición; cada <b>0</b> no suma nada.
          </>
        ) : (
          <>
            De izquierda a derecha: si el peso <b>cabe</b> en lo que queda, escribo <b>1</b> y se lo resto; si no cabe,
            escribo <b>0</b>.
          </>
        )}
      </p>
    </div>
  )
}

/** Tabla ASCII de referencia (GET /api/tabla-ascii). Se carga la primera vez que se abre la sección. */
function TablaAscii({ activa, conectado, onUsar }) {
  const [grupos, setGrupos] = useState(null)
  const [grupo, setGrupo] = useState(0)
  const [fallo, setFallo] = useState(false)
  const pidiendo = useRef(false)

  useEffect(() => {
    if (!activa || !conectado || grupos || pidiendo.current) return
    pidiendo.current = true
    obtenerTablaAscii()
      .then((datos) => {
        setGrupos(datos)
        setFallo(false)
      })
      .catch(() => setFallo(true))
      .finally(() => {
        pidiendo.current = false
      })
  }, [activa, conectado, grupos])

  return (
    <section className="tarjeta referencia">
      <div className="cab">
        <h2>Tabla ASCII</h2>
        <span className="sub">toca una fila para usarla</span>
      </div>
      <div className="grupos">
        {grupos?.map((g, i) => (
          <button key={g.clave} type="button" aria-selected={i === grupo} onClick={() => setGrupo(i)}>
            {g.nombre}
          </button>
        ))}
      </div>
      <div className="tabla-ref">
        {!grupos ? (
          <p className="vacio-texto">
            {fallo || !conectado ? 'No se pudo cargar la tabla: el servidor no responde.' : 'Cargando tabla…'}
          </p>
        ) : (
          <>
            <div className="fila-conv cab">
              <span>Letra</span>
              <span>Dec.</span>
              <span>Binario</span>
            </div>
            {grupos[grupo].filas.map((f) => (
              <button
                key={f.decimal}
                type="button"
                className="fila-conv"
                title={`Usar ${f.caracter === ' ' ? 'el espacio' : f.caracter}`}
                onClick={() => onUsar(f)}
              >
                <span className={f.tipo === 'espacio' ? 'c-letra esp' : 'c-letra'}>
                  {f.tipo === 'espacio' ? '␣' : f.visible}
                </span>
                <span className="c-dec">{f.decimal}</span>
                <span className="c-bits">{f.binario}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  )
}

export default SeccionTexto
