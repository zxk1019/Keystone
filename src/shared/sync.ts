import type { SyncError } from './firebase'
import { sortHabitMarks, sortHabits } from './habits'
import { compareItems } from './items'
import { sortSlots, sortSubjects } from './schedule'
import {
  DEFAULT_SETTINGS,
  type AgendaItem,
  type AppData,
  type RecordChange,
  type Settings,
  type SyncMeta
} from './types'
import {
  isRecord,
  parseAgendaItem,
  parseHabit,
  parseHabitMark,
  parseScheduleSlot,
  parseSubject,
  sanitizeSettings
} from './validation'

/*
 * Sync between devices (the PC and the phone) through the cloud.
 *
 * Every record of the agenda and of the habits, and the settings both devices share, has a key
 * such as "items/<id>". Each device remembers when each key last changed (also for deleted
 * records, so a deletion is not undone by the other device) and which changes the cloud does
 * not have yet. When two devices change the same record, the latest change wins.
 *
 * This file only decides what changes; talking to the cloud is in main/sync.
 */

/** What the Settings screen shows about the sync. */
export type SyncStatus =
  /** No Firebase project yet */
  | { state: 'notConfigured' }
  /** `expired`: the saved session stopped working and the user has to sign in again */
  | { state: 'signedOut'; expired: boolean }
  | {
      state: 'signedIn'
      email: string
      syncing: boolean
      /** Milliseconds since 1970; null until the first sync of this run */
      lastSyncAt: number | null
      /** Changes made here that the cloud does not have yet */
      pending: number
      /** Why the last sync failed; it is tried again by itself */
      error: SyncError | null
    }

export const RECORD_COLLECTIONS = ['subjects', 'schedule', 'items', 'habits', 'habitMarks'] as const
export type RecordCollection = (typeof RECORD_COLLECTIONS)[number]
export type SyncCollection = RecordCollection | 'settings'
const SYNC_COLLECTIONS: SyncCollection[] = [...RECORD_COLLECTIONS, 'settings']

/** The settings that follow the user between devices; the theme, 20-20-20, Spotify... do not. */
export type SharedSettings = Pick<Settings, 'language' | 'notifications' | 'study'>
export const SHARED_SETTINGS_KEY = 'settings/shared'

export function sharedSettings({ language, notifications, study }: Settings): SharedSettings {
  return { language, notifications, study }
}

export function syncKey(collection: SyncCollection, id: string): string {
  return `${collection}/${id}`
}

/** The ids can contain "/", so only the first one separates the collection. */
export function splitSyncKey(key: string): { collection: SyncCollection; id: string } | null {
  const slash = key.indexOf('/')
  const collection = SYNC_COLLECTIONS.find((option) => option === key.slice(0, slash))
  const id = key.slice(slash + 1)
  return slash > 0 && collection && id ? { collection, id } : null
}

/** A record as it travels to and from the cloud. */
export interface SyncRecord {
  key: string
  /** When it changed on the device that made the change; the latest one wins */
  changedAt: number
  /** The record itself, or null when it was deleted */
  data: unknown
}

/** The synced records of the data, by key. */
function recordsByKey(data: AppData): Map<string, unknown> {
  const records = new Map<string, unknown>()
  for (const collection of RECORD_COLLECTIONS) {
    for (const record of data[collection]) records.set(syncKey(collection, record.id), record)
  }
  records.set(SHARED_SETTINGS_KEY, sharedSettings(data.settings))
  return records
}

/** The same records as JSON, which is how two versions are compared. */
function jsonByKey(data: AppData): Map<string, string> {
  const records = new Map<string, string>()
  for (const [key, record] of recordsByKey(data)) records.set(key, JSON.stringify(record))
  return records
}

function unique(keys: string[]): string[] {
  return [...new Set(keys)]
}

/** Later than the change it replaces, so a new change always wins even if the clock went back. */
function nextChangeTime(previous: RecordChange | undefined, now: number): number {
  return previous && previous.at >= now ? previous.at + 1 : now
}

/**
 * Compares two versions of the data and records every record that differs as a change made on
 * this device. The bookkeeping always continues from `before`: `after` may come from anywhere,
 * such as an imported backup.
 */
export function trackChanges(before: AppData, after: AppData, now: number): SyncMeta {
  const previous = jsonByKey(before)
  const current = jsonByKey(after)
  const changed = [...current.keys()].filter((key) => previous.get(key) !== current.get(key))
  const removed = [...previous.keys()].filter((key) => !current.has(key))
  if (changed.length === 0 && removed.length === 0) return before.sync

  const changes = { ...before.sync.changes }
  for (const key of changed) changes[key] = { at: nextChangeTime(changes[key], now) }
  for (const key of removed) changes[key] = { at: nextChangeTime(changes[key], now), deleted: true }
  return {
    ...before.sync,
    changes,
    pending: unique([...before.sync.pending, ...changed, ...removed])
  }
}

const DEFAULT_SHARED_JSON = JSON.stringify(sharedSettings(DEFAULT_SETTINGS))

/**
 * Everything on this device becomes a change the cloud does not have yet: for data from before
 * sync existed, and when signing in to an account this data has not synced with. Settings that
 * were never touched are left out, so a new phone does not overwrite the ones in the cloud.
 */
export function markAllPending(data: AppData, now: number): SyncMeta {
  const changes = { ...data.sync.changes }
  const keys: string[] = []
  for (const [key, json] of jsonByKey(data)) {
    if (key === SHARED_SETTINGS_KEY && !changes[key] && json === DEFAULT_SHARED_JSON) continue
    const change = changes[key]
    if (!change || change.deleted) changes[key] = { at: nextChangeTime(change, now) }
    keys.push(key)
  }
  return { ...data.sync, changes, pending: unique([...data.sync.pending, ...keys]) }
}

/** The bookkeeping to sync with `uid`: a different account than last time starts from zero. */
export function forAccount(data: AppData, uid: string, now: number): SyncMeta {
  if (data.sync.account?.uid === uid) return data.sync
  return { ...markAllPending(data, now), account: { uid, cursor: '' } }
}

/** The changes to upload, with their current content. */
export function pendingRecords(data: AppData): SyncRecord[] {
  const records = recordsByKey(data)
  return data.sync.pending.flatMap((key) => {
    const change = data.sync.changes[key]
    if (!change) return []
    return [{ key, changedAt: change.at, data: change.deleted ? null : (records.get(key) ?? null) }]
  })
}

/** Forgets the uploaded changes, except those that changed again while they were uploading. */
export function markPushed(meta: SyncMeta, pushed: SyncRecord[]): SyncMeta {
  const done = new Set(
    pushed.filter((record) => meta.changes[record.key]?.at === record.changedAt).map((r) => r.key)
  )
  return { ...meta, pending: meta.pending.filter((key) => !done.has(key)) }
}

/** Remembers how far the downloads have got for the current account. */
export function withCursor(meta: SyncMeta, cursor: string): SyncMeta {
  return meta.account ? { ...meta, account: { ...meta.account, cursor } } : meta
}

export interface MergeResult {
  data: AppData
  /** Subjects, timetable, tasks or habits changed, so the screens must reload */
  agendaChanged: boolean
  settingsChanged: boolean
}

/**
 * The other device may point at a subject that no longer exists here, so references are not
 * checked while reading: `withValidReferences` cleans up afterwards.
 */
function referencedSubject(value: Record<string, unknown>): Set<string> {
  return new Set(typeof value.subjectId === 'string' ? [value.subjectId] : [])
}

function referencedHabit(value: Record<string, unknown>): Set<string> {
  return new Set(typeof value.habitId === 'string' ? [value.habitId] : [])
}

/** Applies one downloaded record to its table. False if it cannot be read. */
function applyTo<T>(
  table: Map<string, T>,
  id: string,
  data: unknown,
  parse: (value: Record<string, unknown>) => T | null
): boolean {
  if (data === null) {
    table.delete(id)
    return true
  }
  if (!isRecord(data)) return false
  const parsed = parse({ ...data, id })
  if (!parsed) return false
  table.set(id, parsed)
  return true
}

function withoutSubject(item: AgendaItem): AgendaItem {
  const rest = { ...item }
  delete rest.subjectId
  return rest
}

/**
 * The same clean-up as deleting a subject or a habit: the subject's classes go and its tasks
 * stay without it; the habit's marks go.
 */
function withValidReferences(data: AppData): AppData {
  const subjectIds = new Set(data.subjects.map((subject) => subject.id))
  const missing = (subjectId: string | undefined): boolean =>
    subjectId !== undefined && !subjectIds.has(subjectId)
  const habitIds = new Set(data.habits.map((habit) => habit.id))
  const schedule = data.schedule.filter((slot) => !missing(slot.subjectId))
  const habitMarks = data.habitMarks.filter((mark) => habitIds.has(mark.habitId))
  const danglingItems = data.items.some((item) => missing(item.subjectId))
  if (
    schedule.length === data.schedule.length &&
    habitMarks.length === data.habitMarks.length &&
    !danglingItems
  ) {
    return data
  }
  return {
    ...data,
    schedule,
    items: data.items.map((item) => (missing(item.subjectId) ? withoutSubject(item) : item)),
    habitMarks
  }
}

/**
 * Applies what was downloaded from the cloud. Only records newer than this device's version
 * count; records that cannot be read (e.g. from a newer version of the app) are left alone.
 */
export function applyRemote(data: AppData, remote: SyncRecord[], now: number): MergeResult {
  const newest = new Map<string, SyncRecord>()
  for (const record of remote) {
    const local = data.sync.changes[record.key]
    if (local && local.at >= record.changedAt) continue
    const seen = newest.get(record.key)
    if (!seen || seen.changedAt < record.changedAt) newest.set(record.key, record)
  }
  if (newest.size === 0) return { data, agendaChanged: false, settingsChanged: false }

  const subjects = new Map(data.subjects.map((subject) => [subject.id, subject]))
  const schedule = new Map(data.schedule.map((slot) => [slot.id, slot]))
  const items = new Map(data.items.map((item) => [item.id, item]))
  const habits = new Map(data.habits.map((habit) => [habit.id, habit]))
  const habitMarks = new Map(data.habitMarks.map((mark) => [mark.id, mark]))
  let settings = data.settings
  const changes = { ...data.sync.changes }
  const applied = new Set<string>()

  for (const record of newest.values()) {
    const target = splitSyncKey(record.key)
    if (!target) continue
    let ok = false
    if (target.collection === 'subjects') {
      ok = applyTo(subjects, target.id, record.data, parseSubject)
    } else if (target.collection === 'schedule') {
      ok = applyTo(schedule, target.id, record.data, (value) =>
        parseScheduleSlot(value, referencedSubject(value))
      )
    } else if (target.collection === 'items') {
      ok = applyTo(items, target.id, record.data, (value) =>
        parseAgendaItem(value, referencedSubject(value))
      )
    } else if (target.collection === 'habits') {
      ok = applyTo(habits, target.id, record.data, parseHabit)
    } else if (target.collection === 'habitMarks') {
      ok = applyTo(habitMarks, target.id, record.data, (value) =>
        parseHabitMark(value, referencedHabit(value))
      )
    } else if (record.key === SHARED_SETTINGS_KEY && isRecord(record.data)) {
      // Only the shared part: the other device can never change this one's theme or Spotify
      const { language, notifications, study } = record.data
      settings = sanitizeSettings({ ...settings, language, notifications, study }, settings)
      ok = true
    }
    if (!ok) continue
    changes[record.key] =
      record.data === null ? { at: record.changedAt, deleted: true } : { at: record.changedAt }
    applied.add(record.key)
  }

  const merged: AppData = {
    ...data,
    settings,
    subjects: sortSubjects([...subjects.values()]),
    schedule: sortSlots([...schedule.values()]),
    items: [...items.values()].sort(compareItems),
    habits: sortHabits([...habits.values()]),
    habitMarks: sortHabitMarks([...habitMarks.values()]),
    // A newer version from the cloud replaces whatever this device had waiting to upload
    sync: { ...data.sync, changes, pending: data.sync.pending.filter((key) => !applied.has(key)) }
  }
  // Fixes made here are changes of this device: they go up to the cloud like any other
  const repaired = withValidReferences(merged)
  const result = { ...repaired, sync: trackChanges(merged, repaired, now) }
  return {
    data: result,
    agendaChanged: [...applied].some((key) => key !== SHARED_SETTINGS_KEY),
    settingsChanged:
      JSON.stringify(sharedSettings(settings)) !== JSON.stringify(sharedSettings(data.settings))
  }
}
