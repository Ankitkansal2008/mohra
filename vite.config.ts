import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const buildDate = new Date().toISOString().split('T')[0]
const siteUrl = (process.env.VITE_SITE_URL || 'https://mohra.pages.dev').replace(/\/+$/, '')

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    VITE_SITE_URL: JSON.stringify(siteUrl),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'html-transform-site-url',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html.replace(/%VITE_SITE_URL%/g, siteUrl)
        },
      },
    },
  ],
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
