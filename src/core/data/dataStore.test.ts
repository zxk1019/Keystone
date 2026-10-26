import { describe, expect, it } from 'vitest'
import { createDefaultData } from '@shared/types'
import { DataStore } from './dataStore'
import type { TextFile } from './textFile'

/** A file kept in memory, with the copies set aside next to it. */
function memoryFile(initial: string | null): TextFile & { text: string | null; copies: string[] } {
  const file = {
    text: initial,
    copies: [] as string[],
    read: async () => file.text,
    write: async (text: string) => {
      file.text = text
    },
    copyAside: async (suffix: string) => {
      file.copies.push(suffix)
    }
  }
  return file
}

const subject = { id: 'maths', name: 'Mates', color: 'blue' }

describe('DataStore', () => {
  it('starts empty when there is no file yet', async () => {
    const store = await DataStore.open(memoryFile(null))
    expect(store.get()).toEqual(createDefaultData())
  })

  it('converts version 1 files, keeping a copy, with everything waiting to upload', async () => {
    const file = memoryFile(
      JSON.stringify({ version: 1, settings: {}, subjects: [subject], schedule: [], items: [] })
    )
    const store = await DataStore.open(file)
    await store.saved()
    expect(file.copies).toEqual(['.v1'])
    expect(store.get().sync.pending).toEqual(['subjects/maths'])
    expect(JSON.parse(file.text ?? '').version).toBe(3)
  })

  it('converts version 2 files, keeping a copy, and downloads everything again', async () => {
    const file = memoryFile(
      JSON.stringify({
        version: 2,
        settings: {},
        subjects: [subject],
        schedule: [],
        items: [],
        sync: {
          changes: { 'subjects/maths': { at: 5 } },
          pending: [],
          account: { uid: 'user-1', cursor: '2026-10-21T08:00:00Z' }
        }
      })
    )
    const store = await DataStore.open(file)
    await store.saved()
    expect(file.copies).toEqual(['.v2'])
    expect(store.get().habits).toEqual([])
    // The habits the other device made while this one had the old version come down again
    expect(store.get().sync).toEqual({
      changes: { 'subjects/maths': { at: 5 } },
      pending: [],
      account: { uid: 'user-1', cursor: '' }
    })
    expect(JSON.parse(file.text ?? '').version).toBe(3)
  })

  it('keeps a copy of a broken file and starts again', async () => {
    const file = memoryFile('{ esto no es JSON')
    const store = await DataStore.open(file)
    await store.saved()
    expect(file.copies[0]).toMatch(/^\.corrupt-\d+$/)
    expect(store.get().subjects).toEqual([])
    expect(JSON.parse(file.text ?? '').version).toBe(3)
  })

  it('records local changes, tells the listeners and saves them in order', async () => {
    const file = memoryFile(null)
    const store = await DataStore.open(file)
    let calls = 0
    store.onLocalChange(() => calls++)

    store.update((data) => ({ ...data, subjects: [{ ...subject, color: 'blue' as const }] }))
    store.update((data) => ({ ...data, settings: { ...data.settings, theme: 'dark' } }))
    await store.saved()

    // The theme is not synced, so only the first change is waiting to upload
    expect(calls).toBe(1)
    expect(store.get().sync.pending).toEqual(['subjects/maths'])
    expect(JSON.parse(file.text ?? '').settings.theme).toBe('dark')
  })

  it('saves what the sync brings without recording it as a change of this device', async () => {
    const file = memoryFile(null)
    const store = await DataStore.open(file)
    let calls = 0
    store.onLocalChange(() => calls++)
    store.replaceFromSync({ ...store.get(), subjects: [{ ...subject, color: 'blue' }] })
    await store.saved()
    expect(calls).toBe(0)
    expect(store.get().sync.pending).toEqual([])
    expect(JSON.parse(file.text ?? '').subjects).toHaveLength(1)
  })
})
