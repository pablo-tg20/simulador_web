// =====================================================================
// App.jsx — COMPONENTE PRINCIPAL ("el cerebro visual")
// - Guarda el ESTADO general: sección visible, conexión con el servidor,
//   operaciones y límites que manda el backend.
// - Arma el layout: fondo + encabezado + las 4 secciones + pie.
// - Reparte los datos a cada sección por medio de props.
//
// Las 4 secciones se dibujan siempre y solo se OCULTAN (atributo hidden):
// así, al cambiar de sección, no se pierde lo que habías escrito.
// =====================================================================

import { useCallback, useEffect, useState } from 'react'
import Encabezado from './components/Encabezado'
import Fondo from './components/Fondo'
import { LIMITES_RESPALDO, OPERACIONES_RESPALDO } from './data/constantes'
import SeccionAritmetica from './secciones/SeccionAritmetica'
import SeccionNumeros from './secciones/SeccionNumeros'
import SeccionPruebas from './secciones/SeccionPruebas'
import SeccionTexto from './secciones/SeccionTexto'
import { API_URL, MISMO_SERVIDOR, obtenerOperaciones } from './services/api'

const OPERACIONES_ARITMETICAS = ['suma', 'resta', 'multiplicacion', 'division']
const REINTENTO_MS = 4000 // si el servidor está apagado, se vuelve a intentar cada 4 s

function App() {
  // ------------------------------------------------------------------
  // ESTADO: useState(valorInicial) devuelve [valorActual, funciónParaCambiarlo].
  // Cada vez que se llama a la función "set...", React vuelve a dibujar la pantalla.
  // ------------------------------------------------------------------
  const [vista, setVista] = useState('numeros')
  const [servidor, setServidor] = useState('buscando') // "buscando" | "conectado" | "caido"
  const [operaciones, setOperaciones] = useState(OPERACIONES_RESPALDO)
  const [limites, setLimites] = useState(LIMITES_RESPALDO)
  // Petición para abrir algo en otra sección (la usa Pruebas): { vista, datos, id }
  const [carga, setCarga] = useState(null)

  // ------------------------------------------------------------------
  // CONEXIÓN CON EL BACKEND
  // ------------------------------------------------------------------
  const conectar = useCallback(async () => {
    setServidor((anterior) => (anterior === 'conectado' ? anterior : 'buscando'))
    try {
      const datos = await obtenerOperaciones() // GET /api/operaciones
      setOperaciones(datos.operaciones)
      setLimites({
        maxBits: datos.max_bits,
        maxNumeros: datos.max_numeros,
        maxCaracteres: datos.max_caracteres,
      })
      setServidor('conectado')
    } catch {
      setServidor('caido')
    }
  }, [])

  // Al abrir la página se busca el servidor
  useEffect(() => {
    conectar()
  }, [conectar])

  // Mientras esté apagado, se reintenta solo cada pocos segundos
  useEffect(() => {
    if (servidor !== 'caido') return undefined
    const intervalo = setInterval(conectar, REINTENTO_MS)
    return () => clearInterval(intervalo)
  }, [servidor, conectar])

  // Las secciones avisan aquí si su última petición llegó (true) o no (false)
  const marcarConexion = useCallback((respondio) => {
    setServidor(respondio ? 'conectado' : 'caido')
  }, [])

  // El CSS cambia los colores según <body data-vista="...">
  useEffect(() => {
    document.body.dataset.vista = vista
  }, [vista])

  // ------------------------------------------------------------------
  // Abrir una prueba en su sección (clic en una fila de Pruebas)
  // ------------------------------------------------------------------
  function abrirPrueba(fila) {
    const id = Date.now() // id nuevo = la sección sabe que es otra petición
    if (OPERACIONES_ARITMETICAS.includes(fila.modo)) {
      const numeros = fila.entrada.replace(/[+−×÷]/g, ' ').split(/\s+/).filter(Boolean)
      setCarga({ vista: 'aritmetica', datos: { operacion: fila.modo, numeros, id } })
      setVista('aritmetica')
    } else if (fila.modo === 'decimal_a_binario' || fila.modo === 'binario_a_decimal') {
      setCarga({ vista: 'numeros', datos: { modo: fila.modo, valor: fila.entrada, id } })
      setVista('numeros')
    } else {
      const modo = fila.modo === 'binario_a_texto' ? 'binario_a_texto' : 'texto_a_binario'
      setCarga({ vista: 'texto', datos: { modo, texto: fila.entrada, id } })
      setVista('texto')
    }
  }

  // Cada sección solo recibe la carga que es para ella
  const cargaPara = (nombre) => (carga?.vista === nombre ? carga.datos : null)
  const conectado = servidor === 'conectado'

  // ------------------------------------------------------------------
  // INTERFAZ (JSX): lo que se dibuja en pantalla
  // ------------------------------------------------------------------
  return (
    <>
      <Fondo />
      <div className="app">
        <Encabezado vista={vista} onCambiarVista={setVista} servidor={servidor} onReintentar={conectar} />

        {/* Aviso cuando el backend (FastAPI) no responde */}
        {servidor === 'caido' && (
          <div className="aviso-servidor" role="status">
            {MISMO_SERVIDOR ? (
              <span>
                No hay conexión con el servidor. Puede estar despertando (tarda hasta un minuto);
                se reintenta solo cada pocos segundos.
              </span>
            ) : (
              <span>
                No hay conexión con el servidor de Python en <code>{API_URL}</code>. Enciéndelo con{' '}
                <code>npm run dev</code> (o <code>iniciar.bat</code>); se reintenta solo cada pocos segundos.
              </span>
            )}
            <button className="sec" type="button" onClick={conectar}>
              Reintentar ahora
            </button>
          </div>
        )}

        <SeccionNumeros activa={vista === 'numeros'} carga={cargaPara('numeros')} onConexion={marcarConexion} />
        <SeccionTexto
          activa={vista === 'texto'}
          conectado={conectado}
          maxCaracteres={limites.maxCaracteres}
          carga={cargaPara('texto')}
          onConexion={marcarConexion}
        />
        <SeccionAritmetica
          activa={vista === 'aritmetica'}
          operaciones={operaciones}
          maxNumeros={limites.maxNumeros}
          carga={cargaPara('aritmetica')}
          onConexion={marcarConexion}
        />
        <SeccionPruebas
          activa={vista === 'pruebas'}
          conectado={conectado}
          onAbrir={abrirPrueba}
          onConexion={marcarConexion}
        />

        <footer className="pie">
          <b>Versión 7</b> · Interfaz: React + Vite · Servidor: FastAPI (Python) en <code>{API_URL}</code> ·{' '}
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
            documentación de la API
          </a>
        </footer>
      </div>
    </>
  )
}

export default App // main.jsx importa este componente
