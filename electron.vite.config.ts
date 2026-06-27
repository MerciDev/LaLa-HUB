import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

// Load .env at build time so we can bake the values into the bundle
const envFile = resolve(process.cwd(), '.env')
const env: Record<string, string> = {}
try {
  const parsed = dotenv.parse(readFileSync(envFile))
  Object.assign(env, parsed)
} catch {
  // .env not found — values will be undefined (ok for local dev without .env)
}

/** Convert env vars into Vite define entries: process.env.KEY → "value" */
const defineEnv = Object.fromEntries(
  Object.entries(env).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: defineEnv
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          main: resolve('src/renderer/src/windows/main/main.html'),
          loading: resolve('src/renderer/src/windows/loading/loading.html'),
          overlay: resolve('src/renderer/src/windows/overlay/overlay.html')
        }
      }
    },
    plugins: [react()]
  }
})
