// New versions of the app. Both devices look for them in the GitHub Releases of the project:
// the PC downloads and installs them itself (electron-updater, in src/main/updater.ts) and the
// phone tells the user and opens the APK download.
import { isRecord } from './validation'

export const GITHUB_REPO = 'zxk1019/Keystone'
export const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`
export const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

/** While the app runs, it looks for a new version this often (and once when it starts) */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export type UpdateStatus =
  /** Development and test runs never look for new versions */
  | { state: 'disabled' }
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'upToDate'; checkedAt: number }
  /** PC: the new version is downloading in the background */
  | { state: 'downloading'; version: string; percent: number }
  /** PC: downloaded; it installs when the app restarts */
  | { state: 'ready'; version: string }
  /** Phone: a new version to download from `url` (the APK, or the release page) */
  | { state: 'available'; version: string; url: string }
  | { state: 'error'; checkedAt: number }

/** "v1.10.0" → [1, 10, 0]; null for anything that is not a plain version number. */
function versionParts(version: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim())
  return match ? match.slice(1).map(Number) : null
}

/** True when `candidate` is a later version than `current` (e.g. "1.10.0" after "1.9.2"). */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = versionParts(candidate)
  const b = versionParts(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

export interface LatestRelease {
  version: string
  /** Where to get the phone app: the APK of the release, or its page if it has none */
  downloadUrl: string
}

/** Reads the answer of the GitHub API for the latest release (`LATEST_RELEASE_API`). */
export function parseLatestRelease(value: unknown): LatestRelease | null {
  if (!isRecord(value) || typeof value.tag_name !== 'string') return null
  if (value.draft === true || value.prerelease === true) return null
  const version = value.tag_name.replace(/^v/, '')
  if (!versionParts(version)) return null
  const apk = Array.isArray(value.assets)
    ? value.assets
        .filter(isRecord)
        .find((asset) => typeof asset.name === 'string' && asset.name.endsWith('.apk'))
    : undefined
  // The APK, else the page of the release, else the list of releases
  const downloadUrl =
    [apk?.browser_download_url, value.html_url].find(
      (url): url is string => typeof url === 'string' && isGitHubUrl(url)
    ) ?? RELEASES_PAGE
  return { version, downloadUrl }
}

/** The phone only opens downloads from GitHub, whatever the answer says. */
function isGitHubUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && hostname === 'github.com'
  } catch {
    return false
  }
}
