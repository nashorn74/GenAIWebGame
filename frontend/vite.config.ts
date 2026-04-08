import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 로컬: http://localhost:5000 (기본값)
// Docker Compose: http://backend:5000 (PROXY_TARGET 환경변수로 설정)
const proxyTarget = process.env.PROXY_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // VITE_API_BASE_URL 미설정 시에도 /auth, /api 요청이 백엔드로 전달되도록 프록시
      '/auth': proxyTarget,
      '/api': proxyTarget,
      '/socket.io': { target: proxyTarget, ws: true },
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
