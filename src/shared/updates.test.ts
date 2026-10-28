import { describe, expect, it } from 'vitest'
import { RELEASES_PAGE, isNewerVersion, parseLatestRelease } from './updates'

describe('isNewerVersion', () => {
  it('compares each number, not the text', () => {
    expect(isNewerVersion('1.10.0', '1.9.2')).toBe(true)
    expect(isNewerVersion('2.0.0', '1.99.99')).toBe(true)
    expect(isNewerVersion('1.5.1', '1.5.0')).toBe(true)
  })

  it('is false for the same or an older version', () => {
    expect(isNewerVersion('1.5.0', '1.5.0')).toBe(false)
    expect(isNewerVersion('1.4.9', '1.5.0')).toBe(false)
  })

  it('accepts the v of the tags', () => {
    expect(isNewerVersion('v1.6.0', '1.5.0')).toBe(true)
  })

  it('ignores anything that is not a plain version', () => {
    expect(isNewerVersion('1.6.0-beta.1', '1.5.0')).toBe(false)
    expect(isNewerVersion('latest', '1.5.0')).toBe(false)
  })
})

describe('parseLatestRelease', () => {
  const release = {
    tag_name: 'v1.6.0',
    html_url: 'https://github.com/zxk1019/Keystone/releases/tag/v1.6.0',
    draft: false,
    prerelease: false,
    assets: [
      {
        name: 'keystone-1.6.0-setup.exe',
        browser_download_url:
          'https://github.com/zxk1019/Keystone/releases/download/v1.6.0/keystone-1.6.0-setup.exe'
      },
      {
        name: 'keystone-1.6.0.apk',
        browser_download_url:
          'https://github.com/zxk1019/Keystone/releases/download/v1.6.0/keystone-1.6.0.apk'
      }
    ]
  }

  it('reads the version and the APK', () => {
    expect(parseLatestRelease(release)).toEqual({
      version: '1.6.0',
      downloadUrl: 'https://github.com/zxk1019/Keystone/releases/download/v1.6.0/keystone-1.6.0.apk'
    })
  })

  it('falls back to the release page when there is no APK', () => {
    expect(parseLatestRelease({ ...release, assets: [] })?.downloadUrl).toBe(release.html_url)
  })

  it('only opens downloads from GitHub', () => {
    const elsewhere = {
      ...release,
      assets: [{ name: 'keystone.apk', browser_download_url: 'https://example.com/keystone.apk' }]
    }
    expect(parseLatestRelease(elsewhere)?.downloadUrl).toBe(release.html_url)
    expect(parseLatestRelease({ ...elsewhere, html_url: 'http://github.com/x' })?.downloadUrl).toBe(
      RELEASES_PAGE
    )
  })

  it('ignores drafts, pre-releases and anything that is not a release', () => {
    expect(parseLatestRelease({ ...release, prerelease: true })).toBeNull()
    expect(parseLatestRelease({ ...release, draft: true })).toBeNull()
    expect(parseLatestRelease({ ...release, tag_name: 'nightly' })).toBeNull()
    expect(parseLatestRelease({ message: 'Not Found' })).toBeNull()
    expect(parseLatestRelease(null)).toBeNull()
  })
})
