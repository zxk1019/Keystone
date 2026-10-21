import type { ScheduleSlot, Subject } from './types'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** "08:30" -> 510 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** 510 -> "08:30" */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Returns the slot that shares time with `candidate` on the same day, if any. Touching ends do not count. */
export function findOverlap(
  slots: ScheduleSlot[],
  candidate: Pick<ScheduleSlot, 'weekday' | 'start' | 'end'> & { id?: string }
): ScheduleSlot | undefined {
  const start = timeToMinutes(candidate.start)
  const end = timeToMinutes(candidate.end)
  return slots.find(
    (slot) =>
      slot.id !== candidate.id &&
      slot.weekday === candidate.weekday &&
      timeToMinutes(slot.start) < end &&
      start < timeToMinutes(slot.end)
  )
}

/** Monday first, then by start time. */
/**
 * Subjects in alphabetical order. Every device sorts them the same way, so the lists look the
 * same on the PC and on the phone whatever order they were created or synced in.
 */
export function sortSubjects(subjects: Subject[]): Subject[] {
  return [...subjects].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id)
  )
}

export function sortSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort(
    (a, b) => a.weekday - b.weekday || timeToMinutes(a.start) - timeToMinutes(b.start)
  )
}

/**
 * The slot happening at `minutes` (a class or a break) and the next class after it.
 * Breaks are skipped for "next" because what matters is which class comes after.
 */
export function currentAndNextSlot(
  daySlots: ScheduleSlot[],
  minutes: number
): { current?: ScheduleSlot; next?: ScheduleSlot } {
  const sorted = sortSlots(daySlots)
  const current = sorted.find(
    (slot) => timeToMinutes(slot.start) <= minutes && minutes < timeToMinutes(slot.end)
  )
  const next = sorted.find((slot) => slot.subjectId && timeToMinutes(slot.start) > minutes)
  return { current, next }
}
