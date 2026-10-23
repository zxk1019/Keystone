import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Code shared by the main process, the preload script and the renderer. The core (services
// with state: data, sync, timer) runs in the main process here and inside the phone app.
const sharedAlias = { '@shared': resolve('src/shared'), '@core': resolve('src/core') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias }
  },
  preload: {
    resolve: { alias: sharedAlias }
  },
  renderer: {
    resolve: {
      alias: {
        ...sharedAlias,
        '@renderer': resolve('src/renderer/src'),
        // The PC version of platform/; vite.mobile.config.ts uses the phone one
        '@platform': resolve('src/renderer/src/platform/desktop.ts')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
