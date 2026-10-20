import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'
import es from './es.json'

// The typecheck makes sure the three languages have the same keys, but not that the keys the
// code asks for with t('...') exist. This test reads the source code to check that.

const SRC = join(__dirname, '..', '..')
const PLURAL_SUFFIXES = ['_zero', '_one', '_other']

function lookup(path: string[]): unknown {
  return path.reduce<unknown>(
    (node, part) =>
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined,
    es
  )
}

function keyExists(key: string): boolean {
  const parts = key.split('.')
  const last = parts.pop() ?? ''
  const parent = lookup(parts) as Record<string, unknown> | undefined
  if (!parent || typeof parent !== 'object') return false
  return last in parent || PLURAL_SUFFIXES.some((suffix) => `${last}${suffix}` in parent)
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [full] : []
  })
}

describe('translation keys used in the code', () => {
  it('all exist in the locale files', () => {
    const missing: string[] = []
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, 'utf-8').matchAll(/\bt\(\s*(['`])([^'`]+)\1/g)) {
        const key = match[2]
        // Keys built at run time (`nav.${section}`): at least their fixed start must exist.
        // Keys that start with a variable (`${key}.name`) cannot be checked here.
        const prefix = key.includes('${') ? key.slice(0, key.indexOf('${')) : null
        const ok =
          prefix === null
            ? keyExists(key)
            : prefix === '' || typeof lookup(prefix.replace(/\.$/, '').split('.')) === 'object'
        if (!ok) missing.push(`${relative(SRC, file)}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})
