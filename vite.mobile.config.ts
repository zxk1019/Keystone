import { resolve } from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
 * The phone app (Capacitor): the same React screens with the phone version of platform/.
 * `npm run build:mobile` writes it to out/mobile, which Capacitor copies into the Android app.
 *
 * Test builds can talk to the Firebase emulator on the computer:
 * VITE_FIREBASE_EMULATOR=10.0.2.2 (the computer, seen from the Android emulator).
 */
const emulatorHost = process.env['VITE_FIREBASE_EMULATOR']

/** The phone talks to Firebase from the page itself, so the page has to allow it. */
function phoneContentSecurityPolicy(): Plugin {
  const firebase = ['https://*.googleapis.com']
  if (emulatorHost) firebase.push(`http://${emulatorHost}:9099`, `http://${emulatorHost}:8085`)
  return {
    name: 'phone-content-security-policy',
    transformIndexHtml: (html) =>
      html.replace(
        /(Content-Security-Policy"\s+content=")([^"]*)"/,
        (_, start: string, policy: string) => {
          return `${start}${policy}; connect-src 'self' ${firebase.join(' ')}"`
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
  plugins: [react(), tailwindcss(), phoneContentSecurityPolicy()],
  build: {
    outDir: resolve('out/mobile'),
    emptyOutDir: true
  }
})
