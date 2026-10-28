// npm run build:android [-- debug]: builds the phone screens, copies them into android/ and
// compiles the APK with Gradle. The APK ends up in dist/keystone-<version>.apk.
//
// Capacitor 8 compiles with exactly Java 21, and the Gradle of the project (8.14) does not run
// on the Java 25 of Android Studio. A Java 21 (Temurin) lives in %USERPROFILE%\.mi-estudio\jdk-21
// and is used only here, so the Java installed on the computer does not change. Without that
// folder (the Release workflow on GitHub) it uses the Java 21 of JAVA_HOME. Test builds that
// talk to the Firebase emulator set VITE_FIREBASE_EMULATOR=10.0.2.2 before running this.
const { spawnSync } = require('child_process')
const { copyFileSync, existsSync, mkdirSync, writeFileSync } = require('fs')
const { homedir } = require('os')
const { join } = require('path')

const ROOT = join(__dirname, '..')
const ANDROID = join(ROOT, 'android')
const debug = process.argv.includes('debug')

const windows = process.platform === 'win32'
const projectJava = join(homedir(), '.mi-estudio', 'jdk-21')
const javaHome = existsSync(projectJava) ? projectJava : (process.env.JAVA_HOME ?? '')
const sdk = process.env.ANDROID_HOME || join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
if (!existsSync(join(javaHome, 'bin', windows ? 'java.exe' : 'java'))) {
  throw new Error(`No se encuentra Java 21 en ${projectJava} ni en JAVA_HOME`)
}
if (!existsSync(sdk)) throw new Error(`No se encuentra el SDK de Android en ${sdk}`)

// Gradle reads the SDK folder from local.properties (not in git: it is different on each PC)
const localProperties = join(ANDROID, 'local.properties')
if (!existsSync(localProperties)) {
  writeFileSync(localProperties, `sdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}\n`)
}

const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk }
/** Runs a whole command line in the shell (on Windows, npm, npx and gradlew are .cmd/.bat files). */
function run(commandLine, cwd = ROOT) {
  const result = spawnSync(commandLine, { cwd, env, stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('npm run build:mobile')
run('npx cap sync android')
// Quoted: the project folder has a space ("Mi Estudio")
const gradle = `"${join(ANDROID, windows ? 'gradlew.bat' : 'gradlew')}"`
run(`${gradle} ${debug ? 'assembleDebug' : 'assembleRelease'}`, ANDROID)

const { name, version } = require(join(ROOT, 'package.json'))
const variant = debug ? 'debug' : 'release'
const apk = join(ANDROID, 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`)
if (!existsSync(apk)) {
  throw new Error(`Gradle no ha dejado el APK en ${apk} (¿falta la clave de firma?)`)
}
mkdirSync(join(ROOT, 'dist'), { recursive: true })
const output = join(ROOT, 'dist', `${name}-${version}${debug ? '-debug' : ''}.apk`)
copyFileSync(apk, output)
console.log(`APK listo: ${output}`)
