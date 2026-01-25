import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['uuid', 'sql.js'] })],
    build: {
      rollupOptions: {
        external: []
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@components': resolve('src/renderer/components'),
        '@lib': resolve('src/renderer/lib'),
        '@stores': resolve('src/renderer/stores'),
        '@hooks': resolve('src/renderer/hooks'),
        '@pages': resolve('src/renderer/pages')
      }
    },
    plugins: [react()]
  }
})
