import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
 * The phone app (Capacitor): the same React screens with the phone version of platform/.
 * `npm run build:mobile` writes it to out/mobile, which Capacitor copies into the Android app.
 *
 * Test builds can talk to the Firebase emulator on the computer:
 * VITE_FIREBASE_EMULATOR=10.0.2.2 (the computer, seen from the Android emulator). They can also
 * look for new versions on a local server instead of GitHub: VITE_UPDATES_API=<address>.
 */
const emulatorHost = process.env['VITE_FIREBASE_EMULATOR']
const updatesApi = process.env['VITE_UPDATES_API']
const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'))

/**
 * The phone talks to Firebase (and to GitHub, for new versions) from the page itself, so the
 * page has to allow it.
 */
function phoneContentSecurityPolicy(): Plugin {
  const allowed = ['https://*.googleapis.com', 'https://api.github.com']
  if (emulatorHost) allowed.push(`http://${emulatorHost}:9099`, `http://${emulatorHost}:8085`)
  if (updatesApi) allowed.push(new URL(updatesApi).origin)
  return {
    name: 'phone-content-security-policy',
    transformIndexHtml: (html) =>
      html.replace(
        /(Content-Security-Policy"\s+content=")([^"]*)"/,
        (_, start: string, policy: string) => {
          return `${start}${policy}; connect-src 'self' ${allowed.join(' ')}"`
        }
      )
  }
}

export default defineConfig({
  root: resolve('src/renderer'),
  base: './',
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@core': resolve('src/core'),
      '@renderer': resolve('src/renderer/src'),
      '@platform': resolve('src/renderer/src/platform/mobile/index.ts')
    }
  },
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss(), phoneContentSecurityPolicy()],
  build: {
    outDir: resolve('out/mobile'),
    emptyOutDir: true
  }
})
