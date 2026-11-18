// =====================================================================
// main.jsx — PUNTO DE ARRANQUE DE LA APLICACIÓN
// index.html carga este archivo (<script type="module" src="/src/main.jsx">).
// Su único trabajo es "montar" el componente <App /> dentro del <div id="root">.
// =====================================================================

import { StrictMode } from 'react'            // Modo estricto: React avisa en consola de malas prácticas (solo en desarrollo)
import { createRoot } from 'react-dom/client' // Función que conecta React con el HTML real del navegador
import './index.css'                          // Estilos globales: se cargan UNA vez para toda la app
import App from './App.jsx'                   // Componente principal que contiene toda la interfaz

// 1. document.getElementById('root') busca el <div id="root"> de index.html
// 2. createRoot(...) lo convierte en el "contenedor" de React
// 3. .render(...) dibuja <App /> dentro de ese contenedor
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
