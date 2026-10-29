// npm on Windows leaves out of package-lock.json some packages that @tailwindcss/oxide-wasm32-wasi
// carries inside (bundleDependencies), and then `npm ci` fails on Linux (CI) with
// "Missing: @emnapi/... from lock file". This adds back the entries of the bundled packages that
// are missing, with the versions the package really carries (read from the npm registry).
// Run it after `npm install` or `npm update`: node scripts/fix-lockfile.cjs
const { execFileSync, execSync } = require('node:child_process')
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const LOCK = join(__dirname, '..', 'package-lock.json')
const PACKAGE = 'node_modules/@tailwindcss/oxide-wasm32-wasi'

const lock = JSON.parse(readFileSync(LOCK, 'utf8'))
const parent = lock.packages[PACKAGE]
if (!parent) {
  console.log('package-lock.json no tiene', PACKAGE)
  process.exit(0)
}

const bundled = parent.bundleDependencies ?? []
const missing = bundled.filter((name) => !lock.packages[`${PACKAGE}/node_modules/${name}`])
if (missing.length === 0) {
  console.log('package-lock.json ya está bien')
  process.exit(0)
}

// The real versions are the ones inside the published package
const folder = mkdtempSync(join(tmpdir(), 'lockfix-'))
try {
  const tarball = execSync(`npm pack -q @tailwindcss/oxide-wasm32-wasi@${parent.version}`, {
    cwd: folder,
    encoding: 'utf8'
  }).trim()
  execFileSync('tar', ['-xzf', tarball], { cwd: folder })

  const added = {}
  for (const name of missing) {
    const manifest = JSON.parse(
      readFileSync(join(folder, 'package', 'node_modules', name, 'package.json'), 'utf8')
    )
    added[`${PACKAGE}/node_modules/${name}`] = {
      version: manifest.version,
      dev: parent.dev,
      inBundle: true,
      license: manifest.license,
      optional: parent.optional,
      ...(manifest.dependencies ? { dependencies: manifest.dependencies } : {})
    }
  }

  // Keep the entries in alphabetical order, as npm writes them
  const packages = { ...lock.packages, ...added }
  lock.packages = Object.fromEntries(
    Object.keys(packages)
      .sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'en')))
      .map((key) => [key, packages[key]])
  )
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n')
  console.log('Añadido a package-lock.json:', Object.keys(added).join(', '))
} finally {
  rmSync(folder, { recursive: true, force: true })
}
