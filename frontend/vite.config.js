import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true deja abrir la app desde un celular conectado a la misma red WiFi
  // (http://IP-de-la-PC:5173). En la PC se sigue usando http://localhost:5173.
  server: {
    host: true,
  },
})
