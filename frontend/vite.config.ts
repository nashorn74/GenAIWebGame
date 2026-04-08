import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // VITE_API_BASE_URL 미설정 시에도 /auth, /api 요청이 백엔드로 전달되도록 프록시
      '/auth': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: '../coverage/frontend',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.*',
        'src/MyScene.tsx',
        'src/PhaserGame.tsx',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
})
