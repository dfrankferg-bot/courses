import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `--mode standalone` inlines everything into one self-contained index.html
// that runs by double-clicking (file://) with no server or install.
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone'
  return {
    base: standalone ? './' : '/',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    server: {
      host: true,
      port: 5173,
    },
  }
})
