import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // Don't crash the Vite dev server when the backend is temporarily down.
        // Without this, a single ECONNREFUSED bubbles up as an unhandled error
        // in the proxy middleware and can stall subsequent requests.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Only log once per unique error message to avoid console spam
            if (err.code === 'ECONNREFUSED') {
              console.warn(
                '\n  [proxy] Backend not reachable at http://localhost:8080\n' +
                '  Start it with:  cd EmpathaiBackend-main && mvn spring-boot:run\n'
              )
            }
            // Send a clean JSON error back to the frontend instead of hanging
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                status: 'ERROR',
                message: 'Backend server is not running. Start it with: mvn spring-boot:run'
              }))
            }
          })
        }
      }
    }
  }
})