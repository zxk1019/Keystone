import { describe, expect, it } from 'vitest'
import {
  parseAgendaItem,
  parseAppData,
  parseScheduleSlot,
  parseSubject,
  sanitizeSettings
} from './validation'

describe('sanitizeSettings', () => {
  it('keeps the current value when the new one is not valid', () => {
    expect(
      sanitizeSettings({ theme: 'purple', language: 'en' }, { theme: 'dark', language: 'es' })
    ).toEqual({ theme: 'dark', language: 'en' })
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
  it('rejects files that are not Mi Estudio data', () => {
    expect(parseAppData({ foo: 1 })).toBeNull()
    expect(parseAppData({ version: 2, subjects: [], schedule: [], items: [] })).toBeNull()
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
    expect(data?.settings).toEqual({ theme: 'dark', language: 'es' })
    expect(data?.subjects.map((s) => s.id)).toEqual(['maths'])
    expect(data?.schedule.map((s) => s.id)).toEqual(['a'])
    expect(data?.items).toEqual([])
  })
})
