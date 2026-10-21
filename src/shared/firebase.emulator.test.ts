import { describe, expect, it } from 'vitest'
import {
  commitRecords,
  downloadRecords,
  emulatorUrls,
  refreshSession,
  sendPasswordReset,
  signInWithPassword,
  type AuthSession,
  type FirestoreTarget
} from './firebase'
import type { SyncRecord } from './sync'

/*
 * Talks to the local Firebase emulator, with the real security rules (firebase/firestore.rules).
 * Only runs with `npm run test:emulator`, which starts the emulator and sets this variable.
 */
const emulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST']?.split(':')[0]
const urls = emulatorUrls(emulatorHost ?? '127.0.0.1')
const PROJECT_ID = 'demo-mi-estudio'
// The emulator accepts any key
const API_KEY = 'AIzaSyEmulatorEmulatorEmulatorEmulator1'
const PASSWORD = 'contraseña-de-prueba'

const run = Date.now().toString(36)
let counter = 0
const newEmail = (): string => `prueba-${run}-${++counter}@example.com`

async function newUser(): Promise<AuthSession> {
  const result = await signInWithPassword(urls, API_KEY, 'signUp', newEmail(), PASSWORD)
  if (!result.ok) throw new Error(`sign up failed: ${result.error}`)
  return result.value
}

const targetOf = (session: AuthSession, uid = session.uid): FirestoreTarget => ({
  urls,
  projectId: PROJECT_ID,
  uid,
  idToken: session.idToken
})

describe.skipIf(!emulatorHost)('Firebase emulator', () => {
  it('creates an account, signs in and renews the session', async () => {
    const email = newEmail()
    const created = await signInWithPassword(urls, API_KEY, 'signUp', email, PASSWORD)
    expect(created.ok).toBe(true)
    const again = await signInWithPassword(urls, API_KEY, 'signUp', email, PASSWORD)
    expect(again).toEqual({ ok: false, error: 'emailExists' })

    const signedIn = await signInWithPassword(urls, API_KEY, 'signIn', email, PASSWORD)
    if (!signedIn.ok || !created.ok) throw new Error('sign in failed')
    expect(signedIn.value.uid).toBe(created.value.uid)
    expect(signedIn.value.email).toBe(email)

    const renewed = await refreshSession(urls, API_KEY, signedIn.value.refreshToken)
    expect(renewed.ok && renewed.value.uid).toBe(created.value.uid)
    expect(await refreshSession(urls, API_KEY, 'not-a-token')).toEqual({
      ok: false,
      error: 'sessionExpired'
    })
  })

  it('explains what is wrong with the email or the password', async () => {
    const email = newEmail()
    await signInWithPassword(urls, API_KEY, 'signUp', email, PASSWORD)
    expect(await signInWithPassword(urls, API_KEY, 'signIn', email, 'otra-cosa')).toEqual({
      ok: false,
      error: 'invalidCredentials'
    })
    expect(await signInWithPassword(urls, API_KEY, 'signIn', newEmail(), PASSWORD)).toEqual({
      ok: false,
      error: 'invalidCredentials'
    })
    expect(await signInWithPassword(urls, API_KEY, 'signUp', newEmail(), '123')).toEqual({
      ok: false,
      error: 'weakPassword'
    })
    expect(await signInWithPassword(urls, API_KEY, 'signUp', 'no-es-un-correo', PASSWORD)).toEqual({
      ok: false,
      error: 'invalidEmail'
    })
    expect(await sendPasswordReset(urls, API_KEY, email)).toEqual({ ok: true, value: null })
  })

  it('uploads and downloads records, deleted ones included', async () => {
    const user = await newUser()
    const records: SyncRecord[] = [
      { key: 'items/a/b', changedAt: 200, data: { title: 'Con barra en el id' } },
      { key: 'subjects/maths', changedAt: 210, data: { name: 'Mates' } },
      { key: 'items/old', changedAt: 220, data: null }
    ]
    expect(await commitRecords(targetOf(user), records)).toEqual({ ok: true, value: null })

    const all = await downloadRecords(targetOf(user), '')
    if (!all.ok) throw new Error(all.error)
    // Records written together come back in any order
    const byKey = (list: SyncRecord[]): SyncRecord[] =>
      [...list].sort((a, b) => a.key.localeCompare(b.key))
    expect(byKey(all.value.records)).toEqual(byKey(records))
    expect(all.value.cursor).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    // Far enough in the future that nothing is newer, even with the safety margin
    const later = new Date(Date.now() + 60 * 60_000).toISOString()
    const none = await downloadRecords(targetOf(user), later)
    expect(none.ok && none.value).toEqual({ records: [], cursor: null })
  })

  it('never lets an older change overwrite a newer one', async () => {
    const user = await newUser()
    const record = { key: 'items/x', changedAt: 500, data: { title: 'Nuevo' } }
    expect((await commitRecords(targetOf(user), [record])).ok).toBe(true)
    expect(
      await commitRecords(targetOf(user), [{ ...record, changedAt: 400, data: { title: 'Viejo' } }])
    ).toEqual({ ok: false, error: 'permissionDenied' })
    // The same change again (e.g. an upload that was retried) is fine
    expect((await commitRecords(targetOf(user), [record])).ok).toBe(true)
  })

  it('keeps each user out of the records of the others', async () => {
    const owner = await newUser()
    const other = await newUser()
    await commitRecords(targetOf(owner), [{ key: 'items/secret', changedAt: 1, data: {} }])

    expect(await downloadRecords(targetOf(other, owner.uid), '')).toEqual({
      ok: false,
      error: 'permissionDenied'
    })
    expect(
      await commitRecords(targetOf(other, owner.uid), [{ key: 'items/z', changedAt: 1, data: {} }])
    ).toEqual({ ok: false, error: 'permissionDenied' })
    const own = await downloadRecords(targetOf(other), '')
    expect(own.ok && own.value.records).toEqual([])
  })

  it('rejects records with an unknown collection and expired sessions', async () => {
    const user = await newUser()
    expect(
      await commitRecords(targetOf(user), [{ key: 'passwords/x', changedAt: 1, data: {} }])
    ).toEqual({ ok: false, error: 'permissionDenied' })
    const expired = { ...targetOf(user), idToken: 'not-a-token' }
    const result = await downloadRecords(expired, '')
    expect(result.ok).toBe(false)
  })
})
