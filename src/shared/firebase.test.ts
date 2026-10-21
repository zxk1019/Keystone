import { describe, expect, it } from 'vitest'
import {
  authErrorFrom,
  documentId,
  firestoreErrorFrom,
  parseAuthResponse,
  parseQueryResponse
} from './firebase'

const authError = (message: string, status = 400): ReturnType<typeof authErrorFrom> =>
  authErrorFrom(status, { error: { code: status, message } })

describe('authErrorFrom', () => {
  it('turns Firebase Auth codes into errors the app can explain', () => {
    expect(authError('EMAIL_EXISTS')).toBe('emailExists')
    expect(authError('INVALID_LOGIN_CREDENTIALS')).toBe('invalidCredentials')
    expect(authError('INVALID_PASSWORD')).toBe('invalidCredentials')
    expect(authError('WEAK_PASSWORD : Password should be at least 6 characters')).toBe(
      'weakPassword'
    )
    expect(authError('TOO_MANY_ATTEMPTS_TRY_LATER : Try again later.')).toBe('tooManyAttempts')
    expect(authError('INVALID_EMAIL')).toBe('invalidEmail')
    expect(authError('CONFIGURATION_NOT_FOUND')).toBe('authNotEnabled')
    expect(authError('OPERATION_NOT_ALLOWED')).toBe('authNotEnabled')
    expect(authError('TOKEN_EXPIRED')).toBe('sessionExpired')
    expect(authError('API key not valid. Please pass a valid API key.')).toBe('badConfig')
    expect(authError('Something else', 503)).toBe('unavailable')
    expect(authErrorFrom(400, 'not json')).toBe('unknown')
  })
})

describe('firestoreErrorFrom', () => {
  const error = (
    code: number,
    status: string,
    message = ''
  ): ReturnType<typeof firestoreErrorFrom> =>
    firestoreErrorFrom(code, [{ error: { code, status, message } }])

  it('tells apart a missing database, missing rules and an expired session', () => {
    expect(error(401, 'UNAUTHENTICATED')).toBe('sessionExpired')
    expect(error(403, 'PERMISSION_DENIED', 'Missing or insufficient permissions.')).toBe(
      'permissionDenied'
    )
    expect(
      error(403, 'PERMISSION_DENIED', 'Cloud Firestore API has not been used in project x')
    ).toBe('databaseMissing')
    expect(error(404, 'NOT_FOUND', 'The database (default) does not exist')).toBe('databaseMissing')
    expect(error(503, 'UNAVAILABLE')).toBe('unavailable')
  })
})

describe('parseAuthResponse', () => {
  it('reads sign-in answers and token renewals', () => {
    expect(
      parseAuthResponse(
        { localId: 'u1', email: 'a@b.c', idToken: 'id', refreshToken: 'r', expiresIn: '3600' },
        1000
      )
    ).toEqual({ uid: 'u1', email: 'a@b.c', idToken: 'id', refreshToken: 'r', expiresAt: 3_601_000 })
    expect(
      parseAuthResponse(
        { user_id: 'u1', id_token: 'id', refresh_token: 'r', expires_in: '3600' },
        0
      )
    ).toEqual({ uid: 'u1', email: '', idToken: 'id', refreshToken: 'r', expiresAt: 3_600_000 })
    expect(parseAuthResponse({ localId: 'u1' }, 0)).toBeNull()
  })
})

describe('parseQueryResponse', () => {
  const document = (fields: Record<string, unknown>): unknown => ({ document: { fields } })

  it('reads records, deletions and the latest server time', () => {
    const result = parseQueryResponse([
      document({
        key: { stringValue: 'items/a' },
        changedAt: { integerValue: '1700000000000' },
        data: { stringValue: '{"title":"Hola"}' },
        syncedAt: { timestampValue: '2026-10-21T08:00:00.123456Z' }
      }),
      document({
        key: { stringValue: 'items/b' },
        changedAt: { integerValue: '5' },
        data: { nullValue: null },
        syncedAt: { timestampValue: '2026-10-21T09:00:00Z' }
      }),
      { readTime: '2026-10-21T09:00:01Z' }
    ])
    expect(result.records).toEqual([
      { key: 'items/a', changedAt: 1700000000000, data: { title: 'Hola' } },
      { key: 'items/b', changedAt: 5, data: null }
    ])
    expect(result.cursor).toBe('2026-10-21T09:00:00.000Z')
  })

  it('skips records it cannot read and answers without results', () => {
    const broken = document({
      key: { stringValue: 'items/a' },
      changedAt: { integerValue: '1' },
      data: { stringValue: '{not json' }
    })
    expect(parseQueryResponse([broken, document({ key: { stringValue: 'items/c' } })])).toEqual({
      records: [],
      cursor: null
    })
    expect(parseQueryResponse([{ readTime: 'x' }])).toEqual({ records: [], cursor: null })
  })
})

describe('documentId', () => {
  it('never contains a slash, whatever the key', () => {
    expect(documentId('items/a/b')).toBe('6974656d732f612f62')
    expect(documentId('items/ñ')).not.toContain('/')
  })
})
