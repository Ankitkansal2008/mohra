import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const buildDate = new Date().toISOString().split('T')[0]

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
