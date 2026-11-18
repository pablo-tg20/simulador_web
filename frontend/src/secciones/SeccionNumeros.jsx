// =====================================================================
// secciones/SeccionNumeros.jsx — DECIMAL ↔ BINARIO
// Decimal → binario con divisiones sucesivas entre 2.
// Binario → decimal con suma de potencias de 2.
// El cálculo lo hace el backend (POST /api/convertir-numero → conversion_numeros.py).
// =====================================================================

import { useEffect, useRef, useState } from 'react'
import Bit, { FilaBits, VistaPreviaBits } from '../components/Bit'
import BotonCopiar from '../components/BotonCopiar'
import Selector from '../components/Selector'
import Vacio from '../components/Vacio'
import { MODOS_NUM, plural } from '../data/constantes'
import { ErrorConexion, convertirNumero } from '../services/api'

// Opciones del selector: [{clave, simbolo, nombre}]
const OPCIONES = Object.entries(MODOS_NUM).map(([clave, m]) => ({ clave, simbolo: m.simbolo, nombre: m.nombre }))

// Props:
//   activa     -> true si esta sección se está viendo
//   carga      -> petición externa (desde Pruebas): { modo, valor, id }
//   onConexion -> avisa a App si el servidor respondió (true) o no (false)
function SeccionNumeros({ activa, carga, onConexion }) {
  const [modo, setModo] = useState('decimal_a_binario')
  const [valor, setValor] = useState('')
  const [conversion, setConversion] = useState(null) // última respuesta correcta del backend
  const [error, setError] = useState(null)           // { mensaje, id }

  const entradaRef = useRef(null)
  const resultadoRef = useRef(null)
  const temporizador = useRef(null)  // para convertir mientras se escribe (con pausa)
  const peticion = useRef(0)         // número de la última petición (ignora respuestas viejas)

  const cfg = MODOS_NUM[modo]

  // Al entrar a la sección, el cursor va al campo
  useEffect(() => {
    if (activa) entradaRef.current?.focus()
  }, [activa])

  // Al desmontar, cancelar la conversión pendiente
  useEffect(() => () => clearTimeout(temporizador.current), [])

  // ------------------------------------------------------------------
  // Pedir la conversión al backend
  // ------------------------------------------------------------------
  async function enviar(valorEnviar = valor, modoEnviar = modo, irAlResultado = false) {
    clearTimeout(temporizador.current)
    setError(null)
    const numero = ++peticion.current
    try {
      const datos = await convertirNumero(modoEnviar, valorEnviar)
      onConexion(true)
      if (numero !== peticion.current) return // llegó tarde: ya se pidió otra cosa
      setConversion(datos)
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
    peticion.current++ // cualquier respuesta pendiente se ignora
    clearTimeout(temporizador.current)
    setConversion(null)
    setError(null)
  }

  function elegirModo(nuevoModo, nuevoValor = '') {
    setModo(nuevoModo)
    setValor(nuevoValor)
    limpiarResultado()
  }

  // Al escribir: se convierte solo después de 300 ms sin teclear
  function alEscribir(texto) {
    setValor(texto)
    setError(null)
    clearTimeout(temporizador.current)
    if (texto.trim() === '') {
      limpiarResultado()
      return
    }
    temporizador.current = setTimeout(() => enviar(texto, modo), 300)
  }

  // ⇄ Usar el resultado como entrada de la conversión contraria
  function invertir() {
    const otro = modo === 'decimal_a_binario' ? 'binario_a_decimal' : 'decimal_a_binario'
    const nuevo = conversion ? (modo === 'decimal_a_binario' ? conversion.binario : conversion.decimal) : ''
    elegirModo(otro, nuevo)
    if (nuevo) enviar(nuevo, otro, true)
  }

  function usarEjemplo(ejemplo) {
    setValor(ejemplo)
    enviar(ejemplo, modo, true)
  }

  // Petición que llega desde la sección Pruebas
  useEffect(() => {
    if (!carga) return
    elegirModo(carga.modo, carga.valor)
    enviar(carga.valor, carga.modo, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carga?.id])

  // ------------------------------------------------------------------
  // Ayuda en vivo mientras se escribe (solo visual; la validación real la hace Python)
  // ------------------------------------------------------------------
  const limpio = valor.trim()
  const bits = limpio.replace(/\s/g, '')
  let frase
  let claseEntrada = ''
  if (modo === 'decimal_a_binario') {
    if (limpio === '') {
      frase = <>Se convierte con <b>divisiones sucesivas entre 2</b>: los residuos, leídos de abajo hacia arriba, forman el binario.</>
    } else if (/^\d+$/.test(limpio)) {
      claseEntrada = ' valida'
      frase = <>Voy a dividir <b>{limpio}</b> entre 2 hasta llegar a 0 y anotar cada residuo.</>
    } else {
      claseEntrada = ' invalida'
      frase = <>Solo se aceptan <b>enteros positivos</b>: dígitos 0–9, sin signo, letras ni punto decimal.</>
    }
  } else if (bits === '') {
    frase = <>Cada posición vale una <b>potencia de 2</b> (1, 2, 4, 8, 16…). Se suman las que tienen 1.</>
  } else if (/^[01]+$/.test(bits)) {
    claseEntrada = ' valida'
    frase = (
      <>
        <b>{bits.length}</b> {plural(bits.length, 'bit')}: posiciones de 2<sup>{bits.length - 1}</sup> a 2<sup>0</sup>.
      </>
    )
  } else {
    claseEntrada = ' invalida'
    frase = <>Un número binario solo tiene <b>0</b> y <b>1</b>. Los dígitos en rojo no son válidos.</>
  }

  return (
    <main className="rejilla" hidden={!activa}>
      <div className="col">
        <section className="tarjeta conversor-num">
          <h2>
            <b>1</b> ¿Qué quieres convertir?
          </h2>
          <Selector
            id="selector-numero"
            etiqueta="Tipo de conversión numérica"
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
              className={`entrada${claseEntrada}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck="false"
              maxLength={cfg.maxLength}
              placeholder={cfg.placeholder}
              aria-label="Número a convertir"
              value={valor}
              onChange={(e) => alEscribir(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar(valor, modo, true)}
            />
            <span className="ayuda">{cfg.ayuda}</span>
            {modo === 'binario_a_decimal' && <VistaPreviaBits texto={bits} />}
          </div>

          <p className="frase">{frase}</p>
          {error && (
            <p className="error" role="alert" key={error.id}>
              {error.mensaje}
            </p>
          )}

          <div className="acciones">
            <button className="primario" type="button" onClick={() => enviar(valor, modo, true)}>
              Convertir
            </button>
            <button className="sec" type="button" title="Convertir el resultado al revés" aria-label="Invertir conversión" onClick={invertir}>
              ⇄
            </button>
            <button
              className="sec"
              type="button"
              onClick={() => {
                setValor('')
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
              <button key={ej} className="chip conv" type="button" onClick={() => usarEjemplo(ej)}>
                {ej}
              </button>
            ))}
          </div>
        </section>

        {/* Instrucciones de uso */}
        <section className="tarjeta guia">
          <h2>Cómo usar el programa</h2>
          <ol>
            <li>
              Elige una sección en el menú de arriba: <b>Decimal ↔ Binario</b>, <b>Texto ↔ ASCII</b>, <b>Aritmética</b> o{' '}
              <b>Pruebas</b>.
            </li>
            <li>
              Elige el tipo de conversión, escribe el dato y pulsa <b>Convertir</b> (o Enter).
            </li>
            <li>
              A la derecha verás el resultado y el <b>procedimiento paso a paso</b>.
            </li>
            <li>Si el dato no es válido, aparece un mensaje en rojo que explica el motivo.</li>
          </ol>
        </section>
      </div>

      <div className="col">
        <section className="tarjeta resultado-num" ref={resultadoRef}>
          <div className="cab">
            <h2>Resultado y procedimiento</h2>
            <span className="contador">{conversion ? `${conversion.binario.length} bits` : ''}</span>
          </div>

          {conversion && <BandaNumero c={conversion} />}
          {conversion && <NotaCeros c={conversion} />}

          <div className="procedimiento">
            {!conversion ? (
              <Vacio digitos="1001">
                Escribe un número y pulsa <b>Convertir</b>:
                <br />
                aquí verás las <b>divisiones entre 2</b>
                <br />o la <b>suma de potencias de 2</b>.
              </Vacio>
            ) : conversion.modo === 'decimal_a_binario' ? (
              <Divisiones key={conversion.entrada} c={conversion} />
            ) : (
              <Potencias key={conversion.entrada} c={conversion} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

/** Franja del resultado: bits agrupados en bytes (o el decimal), ecuación, insignia y Copiar */
function BandaNumero({ c }) {
  const aBinario = c.modo === 'decimal_a_binario'
  const n = c.binario.length
  const ancho = Math.min(n <= 8 ? 40 : n <= 16 ? 30 : n <= 32 ? 22 : 16, window.innerWidth <= 520 ? 30 : 40)

  // Separar los bits en grupos de 8 (bytes)
  const bytes = []
  for (let i = 0; i < n; i += 8) bytes.push({ inicio: i, bits: c.binario.slice(i, i + 8) })

  return (
    <div className="banda" key={`${c.modo}-${c.entrada}`}>
      <div className="banda-bits">
        <span className="etq">{MODOS_NUM[c.modo].salida}</span>
        {aBinario ? (
          <div className="bits bytes" style={{ '--w': `${ancho}px` }}>
            {bytes.map((byte) => (
              <div key={byte.inicio} className="byte">
                {[...byte.bits].map((b, j) => (
                  <Bit key={j} valor={b} estilo={{ '--i': Math.min(byte.inicio + j, 20) }} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="numero-grande">{c.decimal}</div>
        )}
      </div>
      <div className="banda-info">
        <span className={`insignia${c.verificado ? '' : ' mal'}`}>{c.verificado ? '✔ Verificado' : '✖ No coincide'}</span>
        <p className="ecuacion">
          {aBinario ? `${c.decimal} (decimal) = ${c.binario_bytes} (binario)` : `${c.binario} (binario) = ${c.decimal} (decimal)`}
        </p>
        <BotonCopiar texto={aBinario ? c.binario : c.decimal} />
      </div>
    </div>
  )
}

/** Nota sobre los ceros a la izquierda */
function NotaCeros({ c }) {
  let texto = ''
  if (c.modo === 'decimal_a_binario' && c.bits_relleno > 0) {
    texto =
      `El resultado directo es ${c.binario_minimo} (${c.binario_minimo.length} bits). ` +
      `Se agregaron ${c.bits_relleno} ${plural(c.bits_relleno, 'cero')} a la izquierda para completar ` +
      `${c.binario.length} bits; los ceros a la izquierda no cambian el valor.`
  } else if (c.modo === 'binario_a_decimal' && c.binario !== c.binario_minimo) {
    texto = `Los ceros a la izquierda no cambian el valor: ${c.binario} vale lo mismo que ${c.binario_minimo}.`
  }
  return texto ? <p className="nota">{texto}</p> : null
}

/** Procedimiento decimal → binario: tabla de divisiones entre 2 */
function Divisiones({ c }) {
  return (
    <>
      <h3 className="titulo-proc">Procedimiento: divisiones sucesivas entre 2</h3>
      <p className="como">
        Se divide entre 2 y se anota el <b>residuo</b> (0 o 1). Se repite con el cociente hasta llegar a 0. El primer
        residuo es el bit de más a la <b>derecha</b>.
      </p>

      {c.pasos.length === 0 ? (
        <p className="como">
          El 0 no necesita divisiones: en binario es <b>0</b>.
        </p>
      ) : (
        <div className="tabla-conv tabla-pasos">
          <div className="fila-conv cab">
            <span>División</span>
            <span>Cociente</span>
            <span>Residuo</span>
            <span>Posición</span>
          </div>
          {c.pasos.map((p, i) => (
            <div key={i} className="fila-conv" style={{ '--i': Math.min(i, 14) }}>
              <span className="c-dec">{p.dividendo} ÷ 2</span>
              <span className="c-dec">{p.cociente}</span>
              <span className="c-bits">
                <Bit valor={p.residuo} />
              </span>
              <span className="c-pos">bit {i}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lectura final: residuos de abajo hacia arriba */}
      <div className="lectura">
        <span>↑ Residuos de abajo hacia arriba:</span>
        <span className="c-bits">
          <FilaBits bits={c.binario_minimo} />
        </span>
        {c.bits_relleno > 0 && (
          <>
            <span>
              → con {c.bits_relleno} {plural(c.bits_relleno, 'cero')} a la izquierda:
            </span>
            <span className="c-bits">
              <FilaBits bits={c.binario} extra={(_, i) => (i < c.bits_relleno ? 'relleno' : '')} />
            </span>
          </>
        )}
      </div>
    </>
  )
}

/** Procedimiento binario → decimal: cada bit × su potencia de 2 */
function Potencias({ c }) {
  return (
    <>
      <h3 className="titulo-proc">Procedimiento: suma de potencias de 2</h3>
      <p className="como">
        Cada posición vale una potencia de 2, empezando con 2<sup>0</sup> = 1 a la <b>derecha</b>. Se suman solo las
        posiciones donde hay un <b>1</b>.
      </p>
      <div className="tabla-conv tabla-pasos">
        <div className="fila-conv cab">
          <span>Posición</span>
          <span>Bit</span>
          <span>Vale</span>
          <span>Aporta</span>
        </div>
        {c.pasos.map((p, i) => (
          <div key={i} className={`fila-conv${p.bit === '1' ? '' : ' apagada'}`} style={{ '--i': Math.min(i, 14) }}>
            <span className="c-pos">
              2<sup>{p.posicion}</sup>
            </span>
            <span className="c-bits">
              <Bit valor={p.bit} />
            </span>
            <span className="c-dec">{p.potencia}</span>
            <span className="c-aporta">{p.bit === '1' ? `+ ${p.valor}` : '0'}</span>
          </div>
        ))}
      </div>
      <div className="suma-total">{c.suma}</div>
    </>
  )
}

export default SeccionNumeros
