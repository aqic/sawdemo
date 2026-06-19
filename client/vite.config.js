import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/game-demo/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
}))
