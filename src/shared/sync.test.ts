import { describe, expect, it } from 'vitest'
import {
  SHARED_SETTINGS_KEY,
  applyRemote,
  forAccount,
  markAllPending,
  markPushed,
  pendingRecords,
  splitSyncKey,
  trackChanges,
  withCursor,
  type SyncRecord
} from './sync'
import { createDefaultData, type AgendaItem, type AppData } from './types'

const maths = { id: 'maths', name: 'Mates', color: 'blue' as const }
const physics = { id: 'physics', name: 'Física', color: 'red' as const }
const mondayMaths = { id: 'slot-1', subjectId: 'maths', weekday: 1, start: '08:00', end: '09:00' }
const homework: AgendaItem = {
  id: 'hw-1',
  type: 'homework',
  title: 'Ejercicios',
  subjectId: 'maths',
  date: '2026-10-22',
  priority: 'medium',
  done: false
}

/** Data with a subject, a class and a task, already synced (nothing pending). */
function syncedData(): AppData {
  const data = createDefaultData()
  return {
    ...data,
    subjects: [maths],
    schedule: [mondayMaths],
    items: [homework],
    sync: {
      changes: {
        'subjects/maths': { at: 100 },
        'schedule/slot-1': { at: 100 },
        'items/hw-1': { at: 100 }
      },
      pending: [],
      account: { uid: 'user-1', cursor: '2026-10-21T08:00:00.000Z' }
    }
  }
}

describe('splitSyncKey', () => {
  it('separates the collection at the first slash only', () => {
    expect(splitSyncKey('items/a/b')).toEqual({ collection: 'items', id: 'a/b' })
    expect(splitSyncKey('settings/shared')).toEqual({ collection: 'settings', id: 'shared' })
    expect(splitSyncKey('other/a')).toBeNull()
    expect(splitSyncKey('items/')).toBeNull()
    expect(splitSyncKey('items')).toBeNull()
  })
})

describe('trackChanges', () => {
  it('records new, edited and deleted records as pending changes', () => {
    const before = syncedData()
    const after: AppData = {
      ...before,
      subjects: [maths, physics],
      items: [{ ...homework, done: true }],
      schedule: []
    }
    const meta = trackChanges(before, after, 500)
    expect(meta.changes['subjects/physics']).toEqual({ at: 500 })
    expect(meta.changes['items/hw-1']).toEqual({ at: 500 })
    expect(meta.changes['schedule/slot-1']).toEqual({ at: 500, deleted: true })
    expect(meta.changes['subjects/maths']).toEqual({ at: 100 })
    expect(meta.pending.sort()).toEqual(['items/hw-1', 'schedule/slot-1', 'subjects/physics'])
  })

  it('returns the same bookkeeping when nothing synced changed', () => {
    const before = syncedData()
    const after = { ...before, settings: { ...before.settings, theme: 'dark' as const } }
    expect(trackChanges(before, after, 500)).toBe(before.sync)
  })

  it('tracks the shared settings but not the ones of this device', () => {
    const before = syncedData()
    const after = { ...before, settings: { ...before.settings, language: 'en' as const } }
    expect(trackChanges(before, after, 500).pending).toEqual([SHARED_SETTINGS_KEY])
  })

  it('ignores the bookkeeping of the new version, e.g. from an imported backup', () => {
    const before = syncedData()
    const imported = { ...createDefaultData(), subjects: [maths] }
    const meta = trackChanges(before, imported, 500)
    expect(meta.account).toEqual(before.sync.account)
    expect(meta.pending.sort()).toEqual(['items/hw-1', 'schedule/slot-1'])
  })

  it('makes a new change win even if the clock went back', () => {
    const before = syncedData()
    const after = { ...before, items: [{ ...homework, title: 'Otro' }] }
    expect(trackChanges(before, after, 50).changes['items/hw-1']).toEqual({ at: 101 })
  })
})

describe('markAllPending and forAccount', () => {
  it('marks every record as pending, but not settings that were never touched', () => {
    const data = { ...syncedData(), sync: { changes: {}, pending: [] } }
    const meta = markAllPending(data, 500)
    expect(meta.pending.sort()).toEqual(['items/hw-1', 'schedule/slot-1', 'subjects/maths'])
    expect(meta.changes['items/hw-1']).toEqual({ at: 500 })
  })

  it('includes settings that differ from the defaults', () => {
    const data = { ...createDefaultData() }
    data.settings = { ...data.settings, language: 'zh-CN' }
    expect(markAllPending(data, 500).pending).toEqual([SHARED_SETTINGS_KEY])
  })

  it('keeps the same bookkeeping for the same account and starts again for another one', () => {
    const data = syncedData()
    expect(forAccount(data, 'user-1', 500)).toBe(data.sync)
    const other = forAccount(data, 'user-2', 500)
    expect(other.account).toEqual({ uid: 'user-2', cursor: '' })
    expect(other.pending).toHaveLength(3)
    // The records keep their own change times
    expect(other.changes['items/hw-1']).toEqual({ at: 100 })
  })
})

describe('pendingRecords and markPushed', () => {
  it('uploads the current content, and null for deleted records', () => {
    const before = syncedData()
    const after = { ...before, items: [], subjects: [maths, physics] }
    const data = { ...after, sync: trackChanges(before, after, 500) }
    expect(pendingRecords(data).sort((a, b) => a.key.localeCompare(b.key))).toEqual([
      { key: 'items/hw-1', changedAt: 500, data: null },
      { key: 'subjects/physics', changedAt: 500, data: physics }
    ])
  })

  it('keeps pending what changed again during the upload', () => {
    const meta = {
      changes: { 'items/a': { at: 600 }, 'items/b': { at: 500 } },
      pending: ['items/a', 'items/b']
    }
    const pushed = [
      { key: 'items/a', changedAt: 500, data: {} },
      { key: 'items/b', changedAt: 500, data: {} }
    ]
    expect(markPushed(meta, pushed).pending).toEqual(['items/a'])
  })

  it('remembers the download cursor only with an account', () => {
    expect(withCursor(syncedData().sync, 'x').account?.cursor).toBe('x')
    expect(withCursor({ changes: {}, pending: [] }, 'x').account).toBeUndefined()
  })
})

describe('applyRemote', () => {
  const remote = (key: string, changedAt: number, data: unknown): SyncRecord => ({
    key,
    changedAt,
    data
  })

  it('applies newer records and ignores older or equal ones', () => {
    const data = syncedData()
    const result = applyRemote(
      data,
      [
        remote('items/hw-1', 200, { ...homework, done: true }),
        remote('subjects/maths', 100, { ...maths, name: 'Igual de viejo' }),
        remote('subjects/physics', 150, physics)
      ],
      1000
    )
    expect(result.data.items[0].done).toBe(true)
    // In alphabetical order, the same on every device
    expect(result.data.subjects).toEqual([physics, maths])
    expect(result.data.sync.changes['items/hw-1']).toEqual({ at: 200 })
    expect(result.data.sync.pending).toEqual([])
    expect(result.agendaChanged).toBe(true)
    expect(result.settingsChanged).toBe(false)
  })

  it('returns the same data when nothing is newer', () => {
    const data = syncedData()
    const result = applyRemote(data, [remote('items/hw-1', 100, homework)], 1000)
    expect(result.data).toBe(data)
    expect(result.agendaChanged).toBe(false)
  })

  it('keeps a newer local change and its pending upload', () => {
    const before = syncedData()
    const after = { ...before, items: [{ ...homework, title: 'Mío' }] }
    const data = { ...after, sync: trackChanges(before, after, 500) }
    const result = applyRemote(
      data,
      [remote('items/hw-1', 300, { ...homework, title: 'Suyo' })],
      1000
    )
    expect(result.data.items[0].title).toBe('Mío')
    expect(result.data.sync.pending).toEqual(['items/hw-1'])
  })

  it('replaces an older local change that was waiting to upload', () => {
    const before = syncedData()
    const after = { ...before, items: [{ ...homework, title: 'Mío' }] }
    const data = { ...after, sync: trackChanges(before, after, 500) }
    const result = applyRemote(
      data,
      [remote('items/hw-1', 600, { ...homework, title: 'Suyo' })],
      1000
    )
    expect(result.data.items[0].title).toBe('Suyo')
    expect(result.data.sync.pending).toEqual([])
  })

  it('deletes records deleted on the other device and remembers the deletion', () => {
    const result = applyRemote(syncedData(), [remote('items/hw-1', 200, null)], 1000)
    expect(result.data.items).toEqual([])
    expect(result.data.sync.changes['items/hw-1']).toEqual({ at: 200, deleted: true })
  })

  it('does not bring back a record deleted here later', () => {
    const before = syncedData()
    const after = { ...before, items: [] }
    const data = { ...after, sync: trackChanges(before, after, 500) }
    const result = applyRemote(data, [remote('items/hw-1', 300, homework)], 1000)
    expect(result.data.items).toEqual([])
  })

  it('uses the newest copy when the same record comes twice', () => {
    const result = applyRemote(
      syncedData(),
      [
        remote('items/hw-1', 300, { ...homework, title: 'Nuevo' }),
        remote('items/hw-1', 200, { ...homework, title: 'Viejo' })
      ],
      1000
    )
    expect(result.data.items[0].title).toBe('Nuevo')
  })

  it('takes the id from the key and ignores records it cannot read', () => {
    const result = applyRemote(
      syncedData(),
      [
        remote('items/hw-2', 200, { ...homework, id: 'other' }),
        remote('items/hw-3', 200, { ...homework, type: 'from-the-future' }),
        remote('unknown/x', 200, {})
      ],
      1000
    )
    expect(result.data.items.map((item) => item.id)).toEqual(['hw-1', 'hw-2'])
    expect(result.data.sync.changes['items/hw-3']).toBeUndefined()
  })

  it('applies a class and a task whose subject arrives in the same download', () => {
    const data = createDefaultData()
    const result = applyRemote(
      data,
      [
        remote('items/hw-1', 200, homework),
        remote('schedule/slot-1', 200, mondayMaths),
        remote('subjects/maths', 200, maths)
      ],
      1000
    )
    expect(result.data.schedule).toEqual([mondayMaths])
    expect(result.data.items[0].subjectId).toBe('maths')
    expect(result.data.sync.pending).toEqual([])
  })

  it('cleans up references to a subject deleted on the other device and uploads the fix', () => {
    const result = applyRemote(syncedData(), [remote('subjects/maths', 200, null)], 1000)
    expect(result.data.schedule).toEqual([])
    expect(result.data.items[0].subjectId).toBeUndefined()
    expect(result.data.sync.pending.sort()).toEqual(['items/hw-1', 'schedule/slot-1'])
    expect(result.data.sync.changes['schedule/slot-1']).toEqual({ at: 1000, deleted: true })
  })

  it('applies only the shared settings', () => {
    const data = syncedData()
    const result = applyRemote(
      data,
      [
        remote(SHARED_SETTINGS_KEY, 200, {
          language: 'en',
          theme: 'dark',
          study: { focusMinutes: 30, breakMinutes: 10 },
          sync: { apiKey: '', projectId: '' }
        })
      ],
      1000
    )
    expect(result.data.settings.language).toBe('en')
    expect(result.data.settings.study).toEqual({ focusMinutes: 30, breakMinutes: 10 })
    expect(result.data.settings.theme).toBe(data.settings.theme)
    expect(result.data.settings.notifications).toEqual(data.settings.notifications)
    expect(result.settingsChanged).toBe(true)
    expect(result.agendaChanged).toBe(false)
  })
})
