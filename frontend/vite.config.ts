import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, /api se redirige al backend para que la aplicación y la API compartan origen
// (necesario para la cookie de sesión SameSite=Strict y la protección CSRF).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      ['/api', '/swagger-ui', '/v3/api-docs'].map((ruta) => [ruta, { target: process.env.VITE_API_URL ?? 'http://localhost:8080' }]),
    ),
  },
})
