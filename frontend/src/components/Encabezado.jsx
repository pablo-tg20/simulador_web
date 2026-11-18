// =====================================================================
// components/Encabezado.jsx — BARRA SUPERIOR
// Logo, título, menú de secciones e indicador del servidor.
// NO decide qué pasa al hacer clic: solo avisa al padre (App.jsx)
// llamando a las funciones que recibe por props.
// =====================================================================

import { VISTAS } from '../data/constantes'

// Texto del indicador según el estado de la conexión
const TEXTO_ESTADO = {
  buscando: 'Conectando con el servidor…',
  conectado: 'Servidor conectado',
  caido: 'Servidor apagado · reintentar',
}

// Props:
//   vista          -> sección actual ("numeros", "texto", "aritmetica", "pruebas")
//   onCambiarVista -> función que recibe la clave de la sección elegida
//   servidor       -> "buscando" | "conectado" | "caido"
//   onReintentar   -> vuelve a buscar el servidor
function Encabezado({ vista, onCambiarVista, servidor, onReintentar }) {
  return (
    <header className="cabecera">
      <div className="marca">
        <div className="logo" aria-hidden="true">
          <span>0</span>
          <span>1</span>
        </div>
        <div>
          <h1>
            Simulador <em>Binario</em>
          </h1>
          <p>Conversiones, código ASCII y aritmética binaria, bit por bit</p>
        </div>
      </div>

      {/* MENÚ PRINCIPAL: una sección por botón */}
      <nav className="modos" aria-label="Sección">
        {VISTAS.map((v) => (
          <button
            key={v.clave}
            className="modo"
            type="button"
            aria-selected={v.clave === vista}
            onClick={() => onCambiarVista(v.clave)}
          >
            <i>{v.icono}</i>
            {v.nombre}
          </button>
        ))}
      </nav>

      {/* Indicador del servidor: verde = conectado, rojo = apagado (clic para reintentar) */}
      <button
        type="button"
        className={`estado ${servidor}`}
        title="Estado del servidor de Python (FastAPI). Clic para volver a comprobar."
        onClick={onReintentar}
      >
        <i />
        <span>{TEXTO_ESTADO[servidor]}</span>
      </button>
    </header>
  )
}

export default Encabezado
