import { describe, expect, it } from 'vitest'
import { authorizeUrl, challengeFor, createVerifier, REDIRECT_URI } from './pkce'

describe('PKCE', () => {
  it('makes verifiers of a valid length with URL-safe characters', () => {
    const verifier = createVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('derives the challenge with SHA-256 (example from RFC 7636)', () => {
    expect(challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    )
  })

  it('builds the authorize address with the loopback redirect', () => {
    const url = new URL(authorizeUrl('https://accounts.spotify.com', 'abc', 'challenge', 'xyz'))
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:43821/callback')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toContain('user-modify-playback-state')
    expect(REDIRECT_URI).not.toContain('localhost')
  })
})
