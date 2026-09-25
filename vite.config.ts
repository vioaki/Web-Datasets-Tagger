import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwa } from './build/pwa'

export default defineConfig({
  plugins: [react(), pwa()],
  // Relative base: works on GitHub Pages project sites, user sites, and
  // arbitrary subpaths without baking the repo name into the build.
  base: './',
  // Pre-bundle the worker-only dependency before the first batch; otherwise
  // Vite discovers it mid-inference and reloads the page in development.
  optimizeDeps: { include: ['onnxruntime-web/webgpu'] },
  resolve: {
    // Mirrors the "@/*" path mapping in tsconfig.json. Kept as a plain
    // string so this file needs no Node type declarations.
    alias: [{ find: /^@\//, replacement: '/src/' }],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
