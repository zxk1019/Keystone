import { isValidTime, timeToMinutes } from './schedule'
import {
  AGENDA_ITEM_TYPES,
  DATA_VERSION,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_EYE_BREAK,
  DEFAULT_SETTINGS,
  DEFAULT_STUDY,
  EYE_BREAK_LIMITS,
  EXAM_REMINDER_DAYS,
  LANGUAGES,
  OVERDUE_REPEAT_HOURS,
  PRIORITIES,
  STUDY_LIMITS,
  SUBJECT_COLORS,
  THEMES,
  type AgendaItem,
  type AppData,
  type EyeBreakSettings,
  type NotificationSettings,
  type ScheduleSlot,
  type Settings,
  type StudySettings,
  type Subject
} from './types'

export const MAX_NAME_LENGTH = 40
export const MAX_ROOM_LENGTH = 20
export const MAX_TITLE_LENGTH = 120
export const MAX_TOPICS_LENGTH = 500

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A trimmed, non-empty string no longer than `max`, or undefined. */
function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text.length > 0 && text.length <= max ? text : undefined
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Keeps only valid values; anything missing or wrong falls back to `fallback`. */
export function sanitizeSettings(value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const input = isRecord(value) ? value : {}
  const theme = THEMES.find((option) => option === input.theme) ?? fallback.theme
  const language = LANGUAGES.find(({ code }) => code === input.language)?.code ?? fallback.language
  return {
    theme,
    language,
    notifications: sanitizeNotifications(input.notifications, fallback.notifications),
    study: sanitizeStudy(input.study, fallback.study),
    eyeBreak: sanitizeEyeBreak(input.eyeBreak, fallback.eyeBreak),
    startWithWindows:
      typeof input.startWithWindows === 'boolean'
        ? input.startWithWindows
        : fallback.startWithWindows
  }
}

/** A whole number within the limits, or undefined. */
function wholeNumber(value: unknown, limits: { min: number; max: number }): number | undefined {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
    ? value
    : undefined
}

function sanitizeEyeBreak(
  value: unknown,
  fallback: EyeBreakSettings = DEFAULT_EYE_BREAK
): EyeBreakSettings {
  const input = isRecord(value) ? value : {}
  const number = (key: keyof typeof EYE_BREAK_LIMITS): number =>
    wholeNumber(input[key], EYE_BREAK_LIMITS[key]) ?? fallback[key]
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    intervalMinutes: number('intervalMinutes'),
    durationSeconds: number('durationSeconds'),
    idleResetMinutes: number('idleResetMinutes')
  }
}

/** Whole minutes within the limits, or the current value. */
function sanitizeStudy(value: unknown, fallback: StudySettings = DEFAULT_STUDY): StudySettings {
  const input = isRecord(value) ? value : {}
  const minutes = (key: keyof StudySettings): number => {
    const candidate = input[key]
    const { min, max } = STUDY_LIMITS[key]
    return typeof candidate === 'number' &&
      Number.isInteger(candidate) &&
      candidate >= min &&
      candidate <= max
      ? candidate
      : fallback[key]
  }
  return { focusMinutes: minutes('focusMinutes'), breakMinutes: minutes('breakMinutes') }
}

/** Same idea as sanitizeSettings, for the notification options. */
function sanitizeNotifications(
  value: unknown,
  fallback: NotificationSettings = DEFAULT_NOTIFICATIONS
): NotificationSettings {
  const input = isRecord(value) ? value : {}
  const time = (key: 'summaryTime' | 'quietStart' | 'quietEnd'): string => {
    const candidate = input[key]
    return isValidTime(candidate) ? candidate : fallback[key]
  }
  const examDays = Array.isArray(input.examDaysBefore)
    ? EXAM_REMINDER_DAYS.filter((day) => (input.examDaysBefore as unknown[]).includes(day))
    : fallback.examDaysBefore
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    summaryTime: time('summaryTime'),
    overdueRepeatHours:
      OVERDUE_REPEAT_HOURS.find((hours) => hours === input.overdueRepeatHours) ??
      fallback.overdueRepeatHours,
    examDaysBefore: examDays,
    quietStart: time('quietStart'),
    quietEnd: time('quietEnd')
  }
}

export function parseSubject(value: unknown): Subject | null {
  if (!isRecord(value) || !isId(value.id)) return null
  const name = cleanText(value.name, MAX_NAME_LENGTH)
  const color = SUBJECT_COLORS.find((option) => option === value.color)
  if (!name || !color) return null
  return { id: value.id, name, color }
}

/**
 * A class needs an existing subject; a break needs a label. `subjectIds` are the subjects
 * that exist right now, so a class never points to a deleted subject.
 */
export function parseScheduleSlot(value: unknown, subjectIds: Set<string>): ScheduleSlot | null {
  if (!isRecord(value) || !isId(value.id)) return null
  const { weekday, start, end } = value
  if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    return null
  }
  if (!isValidTime(start) || !isValidTime(end) || timeToMinutes(start) >= timeToMinutes(end)) {
    return null
  }

  const slot: ScheduleSlot = { id: value.id, weekday, start, end }
  if (isId(value.subjectId)) {
    if (!subjectIds.has(value.subjectId)) return null
    slot.subjectId = value.subjectId
    const room = cleanText(value.room, MAX_ROOM_LENGTH)
    if (room) slot.room = room
  } else {
    const label = cleanText(value.label, MAX_NAME_LENGTH)
    if (!label) return null
    slot.label = label
  }
  return slot
}

export function parseAgendaItem(value: unknown, subjectIds: Set<string>): AgendaItem | null {
  if (!isRecord(value) || !isId(value.id)) return null
  const type = AGENDA_ITEM_TYPES.find((option) => option === value.type)
  const title = cleanText(value.title, MAX_TITLE_LENGTH)
  const priority = PRIORITIES.find((option) => option === value.priority) ?? 'medium'
  if (!type || !title || typeof value.date !== 'string' || !DATE_PATTERN.test(value.date)) {
    return null
  }

  const item: AgendaItem = {
    id: value.id,
    type,
    title,
    date: value.date,
    priority,
    done: value.done === true
  }
  if (isId(value.subjectId) && subjectIds.has(value.subjectId)) item.subjectId = value.subjectId
  if (isValidTime(value.time)) item.time = value.time
  // Only events have an end, and it must come after the start
  if (
    type === 'event' &&
    item.time &&
    isValidTime(value.endTime) &&
    timeToMinutes(value.endTime) > timeToMinutes(item.time)
  ) {
    item.endTime = value.endTime
  }
  if (item.done && typeof value.completedAt === 'string') item.completedAt = value.completedAt
  const topics = cleanText(value.topics, MAX_TOPICS_LENGTH)
  if (type === 'exam' && topics) item.topics = topics
  return item
}

/** Keeps the valid entries of a list and drops the rest. */
function parseList<T>(values: unknown[], parse: (value: unknown) => T | null): T[] {
  return values.map(parse).filter((value): value is T => value !== null)
}

/**
 * Returns the data if it looks like a Mi Estudio data file, or null if it does not.
 * Invalid entries inside the lists are dropped instead of rejecting the whole file.
 */
export function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value) || value.version !== DATA_VERSION) return null
  const { subjects, schedule, items } = value
  if (!Array.isArray(subjects) || !Array.isArray(schedule) || !Array.isArray(items)) return null

  const validSubjects = parseList(subjects, parseSubject)
  const subjectIds = new Set(validSubjects.map((subject) => subject.id))
  return {
    version: DATA_VERSION,
    settings: sanitizeSettings(value.settings),
    subjects: validSubjects,
    schedule: parseList(schedule, (slot) => parseScheduleSlot(slot, subjectIds)),
    items: parseList(items, (item) => parseAgendaItem(item, subjectIds))
  }
}
