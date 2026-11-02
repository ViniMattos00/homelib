import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permite hospedar em qualquer subpasta (GitHub Pages, Netlify, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
})
