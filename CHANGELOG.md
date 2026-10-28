# Changelog

All notable changes to Keystone are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers follow
[Semantic Versioning](https://semver.org/). Each version has the Windows installer and the
Android APK on its [GitHub Release](https://github.com/zxk1019/Keystone/releases).

## [Unreleased]

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

[Unreleased]: https://github.com/zxk1019/Keystone/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/zxk1019/Keystone/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/zxk1019/Keystone/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/zxk1019/Keystone/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/zxk1019/Keystone/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/zxk1019/Keystone/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/zxk1019/Keystone/releases/tag/v1.0.0
