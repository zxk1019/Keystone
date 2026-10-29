// node scripts/firebase.cjs <arguments>: runs the Firebase CLI. Since firebase-tools 15 the
// emulators need Java 21. Like scripts/android-build.cjs, it uses the Java 21 that lives in
// %USERPROFILE%\.mi-estudio\jdk-21 when that folder exists, so the Java installed on the computer
// does not change; without it (GitHub Actions) it uses the Java on the PATH.
const { spawnSync } = require('child_process')
const { existsSync } = require('fs')
const { homedir } = require('os')
const { delimiter, join } = require('path')

const projectJava = join(homedir(), '.mi-estudio', 'jdk-21')

/** The environment for the Firebase CLI, with Java 21 first on the PATH when it is here. */
function firebaseEnv() {
  if (!existsSync(projectJava)) return process.env
  // On Windows the variable is usually called "Path"
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH'
  return {
    ...process.env,
    JAVA_HOME: projectJava,
    [pathKey]: join(projectJava, 'bin') + delimiter + (process.env[pathKey] ?? '')
  }
}

/** Runs `firebase <commandLine>` in the shell (on Windows, firebase is a .cmd file). */
function runFirebase(commandLine) {
  return spawnSync(`firebase ${commandLine}`, { env: firebaseEnv(), stdio: 'inherit', shell: true })
}

module.exports = { runFirebase }

if (require.main === module) {
  const result = runFirebase(process.argv.slice(2).join(' '))
  process.exit(result.status ?? 1)
}
