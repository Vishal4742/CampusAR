import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

// Note: vite-plugin-pwa will be added back in Week 3 (Service Worker week)
// when we actually build the SW. For now, we reference manifest.json directly
// from index.html and register the SW manually.

export default defineConfig({
  plugins: [solid()],

  build: {
    target: 'es2020',
    minify: 'esbuild',
  },

  worker: {
    format: 'es',
  },
})
