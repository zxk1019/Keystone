import type { ScheduleSlot } from './types'

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
export function sortSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort(
    (a, b) => a.weekday - b.weekday || timeToMinutes(a.start) - timeToMinutes(b.start)
  )
}
