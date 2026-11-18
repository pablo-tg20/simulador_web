// vite.config.js — Configuración del servidor de desarrollo de Vite.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Permite usar JSX y recarga instantánea de React

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,       // http://localhost:5173 (el backend permite este origen en CORS)
    strictPort: true, // si el 5173 está ocupado, avisa en vez de usar otro puerto (CORS no lo permitiría)
    open: true,       // abre el navegador automáticamente al arrancar
  },
  preview: {
    port: 4173,       // npm run preview (sirve la versión compilada de dist/)
  },
})
