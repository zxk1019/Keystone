# Security policy

## Supported versions

Only the latest release gets fixes. The PC app updates itself, and the phone app offers the
new APK when you open it.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/zxk1019/Keystone/security/advisories/new)
with the steps to reproduce it and the version you tested. Keystone is a one-person project:
you will get an answer within a week, and a fix as soon as possible after that.

## How Keystone handles your data

- **Your data stays on your devices**: in `%APPDATA%\Mi Estudio` on Windows and in the app's
  private storage on Android. There is no telemetry and no analytics.
- **Sync is optional** and goes to _your own_ Firebase project, not to a shared server. The
  rules in [`firebase/firestore.rules`](firebase/firestore.rules) only let each account read
  and write its own data. The password only goes to Firebase Authentication; the session is
  kept encrypted on Windows (Electron `safeStorage`) and in the app's private storage on
  Android.
- **Spotify** uses the Authorization Code flow with PKCE, so the app has no client secret. The
  tokens only live in the main process and are saved encrypted with `safeStorage`, outside the
  backups.
- **The PC app** runs its screens with `contextIsolation`, `sandbox` and without
  `nodeIntegration`, behind a Content Security Policy. Everything that reaches the main process
  through IPC is validated before it is used or saved.
- **Updates** come over HTTPS from the GitHub Releases of this repository, and the PC app
  checks the SHA-512 of the installer (from `latest.yml`) before it runs it. The installer is
  not code-signed yet. Every release includes `SHA256SUMS.txt` with the checksums of its files.
