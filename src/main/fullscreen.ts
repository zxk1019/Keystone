import { execFile } from 'child_process'

// Values of SHQueryUserNotificationState that mean "do not interrupt": 1 locked or screen
// saver, 2 a full-screen app, 3 a full-screen (Direct3D) game, 4 presentation mode
const BUSY_STATES = new Set([1, 2, 3, 4])

const SCRIPT = [
  'Add-Type -Namespace MiEstudio -Name Shell -MemberDefinition \'[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);\'',
  '$state = 0',
  '[void][MiEstudio.Shell]::SHQueryUserNotificationState([ref]$state)',
  '$state'
].join('; ')

/**
 * Asks Windows whether a full-screen game or a presentation is on, through PowerShell so no
 * native module is needed. If Windows cannot be asked, it answers "not busy".
 */
export function isUserBusy(): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false)
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', SCRIPT],
      { timeout: 10_000, windowsHide: true },
      (error, stdout) => {
        if (error) resolve(false)
        else resolve(BUSY_STATES.has(Number.parseInt(stdout.trim(), 10)))
      }
    )
  })
}
