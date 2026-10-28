import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './types'
import {
  parseAgendaItem,
  parseAppData,
  parseHabit,
  parseHabitMark,
  parseScheduleSlot,
  parseSubject,
  sanitizeSettings
} from './validation'

describe('sanitizeSettings', () => {
  const current = { ...DEFAULT_SETTINGS, theme: 'dark' as const }

  it('keeps the current value when the new one is not valid', () => {
    const result = sanitizeSettings({ theme: 'purple', language: 'en' }, current)
    expect(result.theme).toBe('dark')
    expect(result.language).toBe('en')
  })

  it('fills in the notification options missing from older data files', () => {
    expect(sanitizeSettings({ theme: 'light', language: 'es' })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light'
    })
  })

  it('checks each notification option on its own', () => {
    const { notifications } = sanitizeSettings(
      {
        notifications: {
          enabled: false,
          summaryTime: '25:00',
          overdueRepeatHours: 7,
          examDaysBefore: [1, 9, 7, 'x'],
          quietStart: '23:30',
          quietEnd: 'morning'
        }
      },
      current
    )
    expect(notifications).toEqual({
      enabled: false,
      summaryTime: '17:00',
      overdueRepeatHours: 2,
      examDaysBefore: [7, 1],
      quietStart: '23:30',
      quietEnd: '08:00'
    })
  })
})

describe('parseSubject', () => {
  it('trims the name', () => {
    expect(parseSubject({ id: 's1', name: '  Mates ', color: 'red' })).toEqual({
      id: 's1',
      name: 'Mates',
      color: 'red'
    })
  })

  it('rejects empty names and unknown colors', () => {
    expect(parseSubject({ id: 's1', name: '   ', color: 'red' })).toBeNull()
    expect(parseSubject({ id: 's1', name: 'Mates', color: '#ff0000' })).toBeNull()
  })
})

describe('parseScheduleSlot', () => {
  const subjects = new Set(['maths'])

  it('accepts a class of an existing subject', () => {
    expect(
      parseScheduleSlot(
        { id: 'a', subjectId: 'maths', weekday: 1, start: '08:00', end: '09:00', room: ' 2B ' },
        subjects
      )
    ).toEqual({ id: 'a', subjectId: 'maths', weekday: 1, start: '08:00', end: '09:00', room: '2B' })
  })

  it('rejects a class of a subject that does not exist', () => {
    expect(
      parseScheduleSlot(
        { id: 'a', subjectId: 'ghost', weekday: 1, start: '08:00', end: '09:00' },
        subjects
      )
    ).toBeNull()
  })

  it('needs a label for a break', () => {
    const recess = { id: 'b', weekday: 1, start: '11:00', end: '11:30' }
    expect(parseScheduleSlot(recess, subjects)).toBeNull()
    expect(parseScheduleSlot({ ...recess, label: 'Patio' }, subjects)?.label).toBe('Patio')
  })

  it('rejects wrong days and times', () => {
    const base = { id: 'c', label: 'Patio', start: '11:00', end: '11:30' }
    expect(parseScheduleSlot({ ...base, weekday: 0 }, subjects)).toBeNull()
    expect(parseScheduleSlot({ ...base, weekday: 8 }, subjects)).toBeNull()
    expect(parseScheduleSlot({ ...base, weekday: 1, end: '10:00' }, subjects)).toBeNull()
    expect(parseScheduleSlot({ ...base, weekday: 1, start: '25:00' }, subjects)).toBeNull()
  })
})

describe('parseAgendaItem', () => {
  it('fills in defaults and drops a missing subject', () => {
    expect(
      parseAgendaItem(
        { id: 'i', type: 'homework', title: 'Ejercicios', date: '2026-10-20', subjectId: 'x' },
        new Set()
      )
    ).toEqual({
      id: 'i',
      type: 'homework',
      title: 'Ejercicios',
      date: '2026-10-20',
      priority: 'medium',
      done: false
    })
  })

  it('rejects unknown types and bad dates', () => {
    expect(
      parseAgendaItem({ id: 'i', type: 'party', title: 'x', date: '2026-10-20' }, new Set())
    ).toBeNull()
    expect(
      parseAgendaItem({ id: 'i', type: 'exam', title: 'x', date: '20/10/2026' }, new Set())
    ).toBeNull()
  })
})

describe('parseAppData', () => {
  it('rejects files that are not data of the app', () => {
    expect(parseAppData({ foo: 1 })).toBeNull()
    expect(parseAppData({ version: 4, subjects: [], schedule: [], items: [] })).toBeNull()
    expect(parseAppData({ version: 2, subjects: [], schedule: {}, items: [] })).toBeNull()
  })

  it('reads version 1 files (from before sync) as the current version', () => {
    const data = parseAppData({ version: 1, subjects: [], schedule: [], items: [] })
    expect(data?.version).toBe(3)
    expect(data?.sync).toEqual({ changes: {}, pending: [] })
  })

  it('keeps the valid sync bookkeeping and drops the rest', () => {
    const data = parseAppData({
      version: 2,
      subjects: [],
      schedule: [],
      items: [],
      sync: {
        changes: {
          'items/a': { at: 5 },
          'items/b': { at: 6, deleted: true },
          'nonsense/c': { at: 7 },
          'items/d': { at: 'yesterday' }
        },
        pending: ['items/a', 'items/a', 'items/x', 'constructor', 3],
        account: { uid: 'user-1', cursor: '2026-10-21T08:00:00Z' }
      }
    })
    expect(data?.sync).toEqual({
      changes: { 'items/a': { at: 5 }, 'items/b': { at: 6, deleted: true } },
      pending: ['items/a'],
      account: { uid: 'user-1', cursor: '2026-10-21T08:00:00Z' }
    })
  })

  it('drops invalid entries and classes of missing subjects instead of rejecting the file', () => {
    const data = parseAppData({
      version: 1,
      settings: { theme: 'dark' },
      subjects: [
        { id: 'maths', name: 'Mates', color: 'blue' },
        { id: 'bad', name: '', color: 'blue' }
      ],
      schedule: [
        { id: 'a', subjectId: 'maths', weekday: 1, start: '08:00', end: '09:00' },
        { id: 'b', subjectId: 'bad', weekday: 1, start: '09:00', end: '10:00' }
      ],
      items: ['nonsense']
    })
    expect(data?.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
    expect(data?.subjects.map((s) => s.id)).toEqual(['maths'])
    expect(data?.schedule.map((s) => s.id)).toEqual(['a'])
    expect(data?.items).toEqual([])
  })
})

describe('parseAgendaItem for events and exams', () => {
  const base = { id: 'i', title: 'x', date: '2026-10-20', time: '17:00' }

  it('keeps an end time only for events and only after the start', () => {
    expect(parseAgendaItem({ ...base, type: 'event', endTime: '18:30' }, new Set())?.endTime).toBe(
      '18:30'
    )
    expect(
      parseAgendaItem({ ...base, type: 'event', endTime: '16:00' }, new Set())?.endTime
    ).toBeUndefined()
    expect(
      parseAgendaItem({ ...base, type: 'homework', endTime: '18:30' }, new Set())?.endTime
    ).toBeUndefined()
  })

  it('keeps topics only for exams and the completion date only when done', () => {
    expect(parseAgendaItem({ ...base, type: 'exam', topics: ' Tema 3 ' }, new Set())?.topics).toBe(
      'Tema 3'
    )
    expect(
      parseAgendaItem({ ...base, type: 'homework', topics: 'Tema 3' }, new Set())?.topics
    ).toBeUndefined()
    expect(
      parseAgendaItem({ ...base, type: 'homework', completedAt: '2026-10-20T10:00:00Z' }, new Set())
        ?.completedAt
    ).toBeUndefined()
  })
})

describe('habits', () => {
  const habit = {
    id: 'read',
    name: ' Leer ',
    color: 'teal',
    weekdays: [5, 1, 3, 3, 9],
    createdOn: '2026-10-20'
  }

  it('keeps valid weekdays in order, and needs at least one', () => {
    expect(parseHabit(habit)).toEqual({ ...habit, name: 'Leer', weekdays: [1, 3, 5] })
    expect(parseHabit({ ...habit, weekdays: [0, 8] })).toBeNull()
    expect(parseHabit({ ...habit, createdOn: 'ayer' })).toBeNull()
    expect(parseHabit({ ...habit, color: 'gold' })).toBeNull()
  })

  it('reads marks only of existing habits, with the id of their day', () => {
    const mark = { id: 'read/2026-10-21', habitId: 'read', date: '2026-10-21', status: 'done' }
    const habits = new Set(['read'])
    expect(parseHabitMark(mark, habits)).toEqual(mark)
    expect(parseHabitMark(mark, new Set())).toBeNull()
    expect(parseHabitMark({ ...mark, status: 'maybe' }, habits)).toBeNull()
    expect(parseHabitMark({ ...mark, id: 'read/2026-10-22' }, habits)).toBeNull()
  })

  it('reads files without habits, and drops marks of missing habits', () => {
    const empty = parseAppData({ version: 2, subjects: [], schedule: [], items: [] })
    expect(empty?.habits).toEqual([])
    expect(empty?.habitMarks).toEqual([])

    const data = parseAppData({
      version: 3,
      subjects: [],
      schedule: [],
      items: [],
      habits: [habit],
      habitMarks: [
        { id: 'read/2026-10-21', habitId: 'read', date: '2026-10-21', status: 'missed' },
        { id: 'gym/2026-10-21', habitId: 'gym', date: '2026-10-21', status: 'done' }
      ]
    })
    expect(data?.habits.map((h) => h.id)).toEqual(['read'])
    expect(data?.habitMarks.map((m) => m.id)).toEqual(['read/2026-10-21'])
  })
})

describe('study mode', () => {
  it('stays unset until chosen, and only accepts known modes', () => {
    expect(
      parseAppData({ version: 2, subjects: [], schedule: [], items: [] })?.settings.studyMode
    ).toBeNull()
    const chosen = parseAppData({
      version: 3,
      settings: { studyMode: 'custom' },
      subjects: [],
      schedule: [],
      items: []
    })
    expect(chosen?.settings.studyMode).toBe('custom')
    const wrong = parseAppData({
      version: 3,
      settings: { studyMode: 'turbo' },
      subjects: [],
      schedule: [],
      items: []
    })
    expect(wrong?.settings.studyMode).toBeNull()
  })
})
