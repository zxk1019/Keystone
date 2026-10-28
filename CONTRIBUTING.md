# Contributing to Keystone

Thanks for your interest! Bug reports, ideas and pull requests are welcome. For anything bigger
than a small fix, please open an issue first so we can agree on the approach.

## Getting started

You need:

- **Windows 10 or 11**: the PC app uses Windows notifications, "Start with Windows" and the
  full-screen detection of the 20-20-20 rule.
- **Node.js 24** (the version is in [`.nvmrc`](.nvmrc)) and Git.
- For the Android app: Android Studio (for the Android SDK) and a **Java 21** JDK.
- For the Firebase emulator tests: Java 17 or later.

```bash
git clone https://github.com/zxk1019/Keystone.git
cd Keystone
npm install
npm run dev
```

## Commands

| Command                 | What it does                                                               |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run dev`           | Opens the PC app in development mode (F12 opens the DevTools).             |
| `npm run typecheck`     | Checks the types of the main process and of the screens.                   |
| `npm run lint`          | ESLint and Prettier.                                                       |
| `npm test`              | Unit tests (Vitest, `*.test.ts` next to the code).                         |
| `npm run test:emulator` | Sync and the Firestore rules against the Firebase emulator.                |
| `npm run build:win`     | Windows installer in `dist/keystone-<version>-setup.exe`.                  |
| `npm run dev:mobile`    | The phone screens in the browser (notifications do not work there).        |
| `npm run build:android` | Signed APK in `dist/keystone-<version>.apk` (`-- debug` for a test build). |
| `npm run icons`         | Draws all the icons again from `scripts/make-icons.cjs`.                   |

### Test without touching your own data

Start the app with a separate data folder. A run like this never registers anything with
Windows either:

```bash
MI_ESTUDIO_DATA_DIR=C:/temp/keystone-test npm run dev
```

Use a short path: with a long one Windows cannot create Chromium's files and the app closes as
it starts. [`docs/ejemplo-horario.json`](docs/ejemplo-horario.json) is an example timetable that
you can load with Settings → Import backup.

## How the code is organized

```
src/
  shared/      Pure logic and types used everywhere (with unit tests), IPC contract, translations
  core/        Services with state that run the same on both devices: data, sync, study timer
  main/        PC only (Electron main process): window, tray, notifications, 20-20-20, Spotify, updates
  preload/     The only bridge between the screens and the main process (window.api)
  renderer/    React screens; platform/ hides what is different on the PC and on the phone
android/       Capacitor project of the phone app
firebase/      Firestore rules
```

[`CLAUDE.md`](CLAUDE.md) (in Spanish) has detailed notes on each part, and
[`docs/especificacion.md`](docs/especificacion.md) is the full specification.

## Conventions

- Code (names, comments, files) is in English.
- Every text of the interface lives in `src/shared/locales/` in the three languages (`es`,
  `en`, `zh-CN`). The typecheck fails if a language is missing a key, and a test checks that
  every `t('...')` in the code exists.
- Anything that depends on Electron or Capacitor goes behind `src/renderer/src/platform/`.
- The main process validates everything that comes from the screens before saving it.
- Some internal names still say "Mi Estudio" on purpose: the app id `com.miestudio.app`, the
  data folder, `mi-estudio.exe`, the `miestudio://` links. Changing them would make new versions
  install as a different app and lose the data.
- If you add a synced field or a new kind of record, read the sync notes in `CLAUDE.md` first:
  devices with an older version must not lose data.

## Pull requests

1. Branch from `main`.
2. Make sure `npm run typecheck`, `npm run lint` and `npm test` pass. CI runs them too, plus the
   Firebase emulator tests, and a pull request can only be merged when CI is green.
3. If users will notice the change, add a line under **Unreleased** in
   [`CHANGELOG.md`](CHANGELOG.md).

## Releasing a new version (maintainers)

1. In `CHANGELOG.md`, turn **Unreleased** into the new version with today's date and update
   the links at the end.
2. Set the version: `npm version 1.6.0 --no-git-tag-version` (it updates `package.json` and
   `package-lock.json`; the Android version comes from `package.json` too).
3. Commit ("Version 1.6.0"), push to `main` and wait for CI.
4. Tag it and push the tag:

   ```bash
   git tag -a v1.6.0 -m "Keystone 1.6.0"
   git push origin v1.6.0
   ```

5. The [Release workflow](.github/workflows/release.yml) builds the Windows installer and the
   signed APK and publishes the GitHub Release with the notes from `CHANGELOG.md`. Installed PC
   apps update themselves within a few hours; phones offer the new APK the next time they open.

### The Android signing key

New APKs only install over the app people already have when they are signed with the same key.
It lives outside the repository, in `%USERPROFILE%\.mi-estudio` (`mi-estudio-release.jks` and
`keystore.properties`). Keep a backup of that folder somewhere safe.

The Release workflow reads it from four repository secrets. To set them with the
[GitHub CLI](https://cli.github.com/) from Git Bash, without the passwords ever showing on the
screen:

```bash
cd ~/.mi-estudio
prop() { grep "^$1=" keystore.properties | cut -d= -f2- | tr -d '\r\n'; }
base64 -w0 mi-estudio-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo zxk1019/Keystone
prop storePassword | gh secret set ANDROID_KEYSTORE_PASSWORD --repo zxk1019/Keystone
prop keyAlias | gh secret set ANDROID_KEY_ALIAS --repo zxk1019/Keystone
prop keyPassword | gh secret set ANDROID_KEY_PASSWORD --repo zxk1019/Keystone
```

The workflow also checks that the APK is signed with the expected certificate before it
publishes anything.

The Windows installer is not code-signed, so SmartScreen warns the first time it runs.
