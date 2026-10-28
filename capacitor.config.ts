import type { CapacitorConfig } from '@capacitor/cli'

/*
 * The Android app. `npm run android` builds the phone version of the screens (out/mobile)
 * and copies it into android/.
 *
 * Test builds talk to the Firebase emulator on the computer over plain http, which the app
 * only allows when VITE_FIREBASE_EMULATOR is set (see vite.mobile.config.ts).
 */
const emulatorHost = process.env['VITE_FIREBASE_EMULATOR']

const config: CapacitorConfig = {
  appId: 'com.miestudio.app',
  appName: 'Keystone',
  webDir: 'out/mobile',
  android: {
    allowMixedContent: Boolean(emulatorHost)
  },
  server: emulatorHost ? { cleartext: true } : undefined,
  plugins: {
    LocalNotifications: {
      // The white keystone in android/app/src/main/res/drawable (made by npm run icons)
      smallIcon: 'ic_stat_mi_estudio',
      iconColor: '#4f46e5'
    }
  }
}

export default config
