import type { SyncRecord } from './sync'
import { isRecord } from './validation'

/*
 * The user's Firebase project through its REST API, with plain fetch and no SDK, so the same
 * code can run in the phone app later. Firebase Auth signs in with email and password, and
 * Firestore keeps one document per synced record in users/<uid>/records.
 */

export type SyncError =
  /** No connection, or Firebase took too long */
  | 'offline'
  /** Firebase is busy or failing right now: trying again later should work */
  | 'unavailable'
  | 'invalidCredentials'
  | 'emailExists'
  | 'weakPassword'
  | 'invalidEmail'
  | 'tooManyAttempts'
  /** The saved session no longer works: sign in again */
  | 'sessionExpired'
  /** Wrong API key */
  | 'badConfig'
  /** Email and password sign-in is not turned on in the Firebase project */
  | 'authNotEnabled'
  /** No Firestore database in the project (or a wrong project ID) */
  | 'databaseMissing'
  /** The security rules are missing or wrong */
  | 'permissionDenied'
  | 'unknown'

export type SyncResult<T> = { ok: true; value: T } | { ok: false; error: SyncError }

export interface FirebaseUrls {
  /** Identity Toolkit: sign up, sign in and password reset */
  identity: string
  /** Secure Token: renews the session */
  token: string
  firestore: string
}

export const FIREBASE_URLS: FirebaseUrls = {
  identity: 'https://identitytoolkit.googleapis.com/v1',
  token: 'https://securetoken.googleapis.com/v1',
  firestore: 'https://firestore.googleapis.com/v1'
}

/** The local Firebase emulator (`npm run emulators`), for development tests. */
export function emulatorUrls(host: string): FirebaseUrls {
  return {
    identity: `http://${host}:9099/identitytoolkit.googleapis.com/v1`,
    token: `http://${host}:9099/securetoken.googleapis.com/v1`,
    firestore: `http://${host}:8085/v1`
  }
}

/** A signed-in user. The ID token opens Firestore for about an hour; the refresh token renews it. */
export interface AuthSession {
  uid: string
  email: string
  idToken: string
  refreshToken: string
  /** Milliseconds since 1970 */
  expiresAt: number
}

const REQUEST_TIMEOUT_MS = 20_000

type ApiResponse = { ok: true; status: number; body: unknown } | { ok: false; error: SyncError }

async function request(url: string, init: RequestInit): Promise<ApiResponse> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    return { ok: false, error: 'offline' }
  }
  const text = await response.text().catch(() => '')
  let body: unknown = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // Not JSON (e.g. a proxy error page): the status code is enough
  }
  return { ok: true, status: response.status, body }
}

/** Google APIs answer errors as { error: { message, status } }; queries wrap it in a list. */
export function errorInfo(body: unknown): { message: string; status: string } {
  const source: unknown = Array.isArray(body) ? body.find((entry) => isRecord(entry)) : body
  const error = isRecord(source) && isRecord(source.error) ? source.error : {}
  return {
    message: typeof error.message === 'string' ? error.message : '',
    status: typeof error.status === 'string' ? error.status : ''
  }
}

/** Firebase Auth errors are codes such as "EMAIL_EXISTS" or "WEAK_PASSWORD : Password should...". */
export function authErrorFrom(httpStatus: number, body: unknown): SyncError {
  const { message } = errorInfo(body)
  const code = message.split(/[\s:]/)[0]
  switch (code) {
    case 'EMAIL_EXISTS':
      return 'emailExists'
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'USER_DISABLED':
      return 'invalidCredentials'
    case 'WEAK_PASSWORD':
    case 'MISSING_PASSWORD':
      return 'weakPassword'
    case 'INVALID_EMAIL':
    case 'MISSING_EMAIL':
      return 'invalidEmail'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'tooManyAttempts'
    case 'OPERATION_NOT_ALLOWED':
    case 'PASSWORD_LOGIN_DISABLED':
    case 'CONFIGURATION_NOT_FOUND':
      return 'authNotEnabled'
    case 'TOKEN_EXPIRED':
    case 'INVALID_REFRESH_TOKEN':
    case 'INVALID_ID_TOKEN':
    case 'USER_NOT_FOUND':
    case 'PROJECT_NUMBER_MISMATCH':
    case 'MISSING_REFRESH_TOKEN':
      return 'sessionExpired'
  }
  if (/api key/i.test(message) || code.startsWith('API_KEY')) return 'badConfig'
  if (httpStatus === 429 || httpStatus >= 500) return 'unavailable'
  return 'unknown'
}

export function firestoreErrorFrom(httpStatus: number, body: unknown): SyncError {
  const { message, status } = errorInfo(body)
  if (httpStatus === 401 || status === 'UNAUTHENTICATED') return 'sessionExpired'
  // "Cloud Firestore API has not been used in project ... or it is disabled"
  if (/has not been used|is disabled/i.test(message)) return 'databaseMissing'
  if (httpStatus === 403 || status === 'PERMISSION_DENIED') return 'permissionDenied'
  // "The database (default) does not exist for project ..."
  if (httpStatus === 404 || status === 'NOT_FOUND') return 'databaseMissing'
  if (httpStatus === 429 || httpStatus >= 500) return 'unavailable'
  return 'unknown'
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null

/** Sign-in answers use camelCase and token renewals snake_case. */
export function parseAuthResponse(body: unknown, now: number): AuthSession | null {
  if (!isRecord(body)) return null
  const uid = text(body.localId) ?? text(body.user_id)
  const idToken = text(body.idToken) ?? text(body.id_token)
  const refreshToken = text(body.refreshToken) ?? text(body.refresh_token)
  const expiresIn = Number(body.expiresIn ?? body.expires_in)
  if (!uid || !idToken || !refreshToken || !Number.isFinite(expiresIn)) return null
  return {
    uid,
    email: text(body.email) ?? '',
    idToken,
    refreshToken,
    expiresAt: now + expiresIn * 1000
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function signInWithPassword(
  urls: FirebaseUrls,
  apiKey: string,
  mode: 'signIn' | 'signUp',
  email: string,
  password: string
): Promise<SyncResult<AuthSession>> {
  const endpoint = mode === 'signUp' ? 'accounts:signUp' : 'accounts:signInWithPassword'
  const response = await request(`${urls.identity}/${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  if (!response.ok) return response
  if (response.status !== 200) {
    return { ok: false, error: authErrorFrom(response.status, response.body) }
  }
  const session = parseAuthResponse(response.body, Date.now())
  return session ? { ok: true, value: { ...session, email } } : { ok: false, error: 'unknown' }
}

/** A fresh ID token. The answer has no email, so it comes back empty. */
export async function refreshSession(
  urls: FirebaseUrls,
  apiKey: string,
  refreshToken: string
): Promise<SyncResult<AuthSession>> {
  const response = await request(`${urls.token}/token?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  })
  if (!response.ok) return response
  if (response.status !== 200) {
    return { ok: false, error: authErrorFrom(response.status, response.body) }
  }
  const session = parseAuthResponse(response.body, Date.now())
  return session ? { ok: true, value: session } : { ok: false, error: 'unknown' }
}

/**
 * Firebase sends the email with the link to choose a new password. It answers the same whether
 * the account exists or not, so nobody can find out which emails have an account.
 */
export async function sendPasswordReset(
  urls: FirebaseUrls,
  apiKey: string,
  email: string
): Promise<SyncResult<null>> {
  const response = await request(
    `${urls.identity}/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email })
    }
  )
  if (!response.ok) return response
  if (response.status === 200) return { ok: true, value: null }
  const error = authErrorFrom(response.status, response.body)
  // Projects without that protection say so; the answer to the user stays the same
  return error === 'invalidCredentials' ? { ok: true, value: null } : { ok: false, error }
}

/** Where a user's records live in Firestore. */
export interface FirestoreTarget {
  urls: FirebaseUrls
  projectId: string
  uid: string
  idToken: string
}

function documentsPath(projectId: string): string {
  return `projects/${projectId}/databases/(default)/documents`
}

/** Firestore ids cannot contain "/", which the keys and ids may have: hex keeps any key safe. */
export function documentId(key: string): string {
  return [...new TextEncoder().encode(key)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** One write of a commit: the record, plus the server time it reached the cloud. */
export function recordWrite(projectId: string, uid: string, record: SyncRecord): unknown {
  return {
    update: {
      name: `${documentsPath(projectId)}/users/${uid}/records/${documentId(record.key)}`,
      fields: {
        key: { stringValue: record.key },
        changedAt: { integerValue: String(record.changedAt) },
        data:
          record.data === null ? { nullValue: null } : { stringValue: JSON.stringify(record.data) }
      }
    },
    updateTransforms: [{ fieldPath: 'syncedAt', setToServerValue: 'REQUEST_TIME' }]
  }
}

/** Firestore accepts up to 500 writes per commit. */
export const MAX_WRITES_PER_COMMIT = 400

export async function commitRecords(
  target: FirestoreTarget,
  records: SyncRecord[]
): Promise<SyncResult<null>> {
  const response = await request(
    `${target.urls.firestore}/${documentsPath(target.projectId)}:commit`,
    {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${target.idToken}` },
      body: JSON.stringify({
        writes: records.map((record) => recordWrite(target.projectId, target.uid, record))
      })
    }
  )
  if (!response.ok) return response
  if (response.status !== 200) {
    return { ok: false, error: firestoreErrorFrom(response.status, response.body) }
  }
  return { ok: true, value: null }
}

export interface Downloaded {
  records: SyncRecord[]
  /** Server time of the latest record received, to continue from there next time */
  cursor: string | null
}

/** Reads the answer of a query: a list of { document } entries. */
export function parseQueryResponse(body: unknown): Downloaded {
  const records: SyncRecord[] = []
  let latest = Number.NEGATIVE_INFINITY
  for (const entry of Array.isArray(body) ? body : []) {
    if (!isRecord(entry) || !isRecord(entry.document) || !isRecord(entry.document.fields)) continue
    const fields = entry.document.fields
    const field = (name: string): Record<string, unknown> =>
      isRecord(fields[name]) ? fields[name] : {}

    const syncedAt = Date.parse(String(field('syncedAt').timestampValue))
    if (Number.isFinite(syncedAt)) latest = Math.max(latest, syncedAt)

    const key = text(field('key').stringValue)
    const changedAt = Number(field('changedAt').integerValue)
    if (!key || !Number.isSafeInteger(changedAt)) continue
    const raw = field('data')
    if ('nullValue' in raw) {
      records.push({ key, changedAt, data: null })
      continue
    }
    try {
      records.push({ key, changedAt, data: JSON.parse(String(raw.stringValue)) })
    } catch {
      // Not readable: skipped, like any record this version of the app does not understand
    }
  }
  return { records, cursor: Number.isFinite(latest) ? new Date(latest).toISOString() : null }
}

/**
 * The records that reached the cloud after `since` (all of them without it). Writes that
 * happen at the same moment can show up a little late, so the query starts a bit earlier:
 * receiving a record twice does no harm.
 */
export const CURSOR_MARGIN_MS = 2 * 60_000

export async function downloadRecords(
  target: FirestoreTarget,
  since: string
): Promise<SyncResult<Downloaded>> {
  const sinceTime = Date.parse(since)
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: 'records' }],
    orderBy: [{ field: { fieldPath: 'syncedAt' }, direction: 'ASCENDING' }]
  }
  if (Number.isFinite(sinceTime)) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'syncedAt' },
        op: 'GREATER_THAN',
        value: { timestampValue: new Date(sinceTime - CURSOR_MARGIN_MS).toISOString() }
      }
    }
  }
  const response = await request(
    `${target.urls.firestore}/${documentsPath(target.projectId)}/users/${target.uid}:runQuery`,
    {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${target.idToken}` },
      body: JSON.stringify({ structuredQuery })
    }
  )
  if (!response.ok) return response
  if (response.status !== 200) {
    return { ok: false, error: firestoreErrorFrom(response.status, response.body) }
  }
  return { ok: true, value: parseQueryResponse(response.body) }
}
