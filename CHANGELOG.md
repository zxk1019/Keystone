# Changelog

All notable changes to Keystone are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers follow
[Semantic Versioning](https://semver.org/). Each version has the Windows installer and the
Android APK on its [GitHub Release](https://github.com/zxk1019/Keystone/releases).

## [Unreleased]

## [1.6.2] - 2026-11-03

### Fixed

- A copy of Keystone that was only built, not installed (`dist/win-unpacked`), could register
  itself to start with Windows and take over the Start menu shortcut. Then "Restart and update"
  installed the new version but Windows kept opening the old copy. Now only the installed app
  registers itself and looks for updates.

## [1.6.1] - 2026-11-02

### Added

- The password fields of Settings → Sync have an eye button to show what you typed, and
  creating an account asks for the password twice.

### Changed

- Settings → Sync has a clearer guide to set up Firebase: each step has a title, says where to
  find each button in the new Firebase console and how to get the web API key (it no longer
  shows in the project settings until you register a web app). The rules are copied with one
  button.
- Signing in and creating an account are now two separate choices.

## [1.6.0] - 2026-11-02

### Added

- In the "At the computer" study mode (20-20-20), the 20 seconds of looking far away now cover
  every monitor with the dark screen, like the automatic eye breaks. A switch under the study
  modes and in Settings → Eye breaks (20-20-20) turns it off; without it you only get the chime
  and a notification.

### Fixed

- The 20-second rest of the "At the computer" study mode was easy to miss: it only showed a
  Windows notification, which does not appear while Keystone is in front, with Do Not Disturb
  on or in full screen.

### Changed

- The Windows installer is built with electron-builder 26.17.0, which compresses the program
  files with a filter that the installer can always unpack. The installer is about 9 MB bigger.

## [1.5.0] - 2026-10-28

### Added

- Automatic updates on the PC: Keystone looks for new versions on GitHub when it starts and
  every 6 hours, downloads them in the background and installs them when it restarts.
- The phone checks for a new version when you open it and offers to download the new APK.
- Settings → Updates shows the installed version and has a "Check for updates" button.
- The project is public on GitHub, with releases built by GitHub Actions.

### Changed

- Updating no longer removes "Start with Windows" or the links of the notification buttons
  for a moment: only uninstalling does.

### Security

- Electron 44.10.0, which stops trusting some compromised eMudhra intermediate certificates.

### Fixed

- Today lists the classes in order of time also when the timetable comes from an imported
  backup.
- On the phone, many changes in a row are saved together, so they are on disk right away
  and none are lost if Android closes the app just after.

## [1.4.0] - 2026-10-28

### Changed

- The app is now called **Keystone** (it was "Mi Estudio"), with a new icon: the keystone of an
  arch with a K. The installer and the APK are called `keystone-<version>`.
- It installs over the previous version and keeps the same data, the same Windows shortcuts and
  the same app on the phone.

## [1.3.0] - 2026-10-26

### Added

- Habits: name, color and days of the week, marked with a tick or a cross on a week or a month
  view, with the current streak and the record. They sync and go into the backups.
- Three study timer modes: "With computer" (20-20-20: 20 minutes, then 20 seconds looking far
  away), "Without computer" (45 + 5) and "Custom". Each device remembers its own.

### Removed

- The random study tips.

## [1.2.0] - 2026-10-23

### Added

- Android app with the same screens: agenda, tasks, study timer, sync and reminders that arrive
  with the app closed, with a "Done" button.
- On the phone, the Spotify panel opens the Spotify app on the study playlist.

## [1.1.0] - 2026-10-21

### Added

- Optional sync between the PC and the phone through your own free Firebase project: subjects,
  timetable, tasks and the shared settings. The last change wins.
- A step-by-step guide in Settings → Sync to set up the Firebase project.

## [1.0.0] - 2026-10-20

First version for Windows.

### Added

- Today: the classes of the day, what is due and the next exams.
- Agenda: weekly timetable with colored subjects and a month view.
- Tasks: homework, exams, projects and events, with filters.
- Reminders: daily summary, exams some days before, overdue work and quiet hours, with a "Done"
  button on the notification.
- Study zone: timer with breaks, the 20-20-20 rule for the eyes on every monitor, Spotify
  controls and study techniques.
- Light and dark themes; Spanish, English and Simplified Chinese.
- Backups that you can export and import, and an installer that keeps your data when you
  uninstall the app.

[Unreleased]: https://github.com/zxk1019/Keystone/compare/v1.6.2...HEAD
[1.6.2]: https://github.com/zxk1019/Keystone/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/zxk1019/Keystone/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/zxk1019/Keystone/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/zxk1019/Keystone/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/zxk1019/Keystone/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/zxk1019/Keystone/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/zxk1019/Keystone/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/zxk1019/Keystone/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/zxk1019/Keystone/releases/tag/v1.0.0
