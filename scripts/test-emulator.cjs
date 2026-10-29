// npm run test:emulator: starts the Firebase emulators, runs src/shared/firebase.emulator.test.ts
// against them and closes them. On Windows the Firestore emulator (Java) stays open after
// `emulators:exec`, so it is also closed through its own shutdown address. The emulators need
// Java 21: scripts/firebase.cjs finds it.
const firebaseConfig = require('../firebase.json')
const { runFirebase } = require('./firebase.cjs')

const result = runFirebase(
  'emulators:exec --only auth,firestore --project demo-mi-estudio "vitest run src/shared/firebase.emulator.test.ts"'
)

const firestorePort = firebaseConfig.emulators.firestore.port
fetch(`http://127.0.0.1:${firestorePort}/shutdown`, { method: 'POST' })
  .catch(() => {
    // Already closed
  })
  .finally(() => process.exit(result.status ?? 1))
