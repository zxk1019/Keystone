// Data model shared by the main process and the renderer (see docs/especificacion.md, section 3)

export type ThemeSetting = 'light' | 'dark' | 'system'
export type Language = 'es' | 'en' | 'zh-CN'

/** Days before an exam that a reminder can be sent */
export const EXAM_REMINDER_DAYS = [14, 7, 5, 3, 2, 1] as const
/** Hours between repeated overdue reminders; 0 means "do not repeat" */
export const OVERDUE_REPEAT_HOURS = [1, 2, 3, 4, 0] as const

export interface NotificationSettings {
  enabled: boolean
  /** "HH:mm": daily summary, and also when exam reminders go out */
  summaryTime: string
  overdueRepeatHours: (typeof OVERDUE_REPEAT_HOURS)[number]
  examDaysBefore: number[]
  /** "HH:mm" to "HH:mm"; may wrap past midnight (22:00 to 08:00) */
  quietStart: string
  quietEnd: string
}

export interface StudySettings {
  /** Length of a study block */
  focusMinutes: number
  breakMinutes: number
}

export const STUDY_LIMITS = {
  focusMinutes: { min: 1, max: 120 },
  breakMinutes: { min: 1, max: 60 }
} as const

/** The 20-20-20 rule: every so often, look at something far away for a few seconds. */
export interface EyeBreakSettings {
  enabled: boolean
  /** Minutes of computer use between eye breaks */
  intervalMinutes: number
  durationSeconds: number
  /** Minutes without mouse or keyboard after which the count starts again */
  idleResetMinutes: number
}

export const EYE_BREAK_LIMITS = {
  intervalMinutes: { min: 1, max: 120 },
  durationSeconds: { min: 5, max: 120 },
  idleResetMinutes: { min: 1, max: 30 }
} as const

export interface Settings {
  theme: ThemeSetting
  language: Language
  notifications: NotificationSettings
  study: StudySettings
  eyeBreak: EyeBreakSettings
  /** Only has an effect in the installed app */
  startWithWindows: boolean
}

/** Palette for subjects. Each name maps to light and dark styles in the renderer. */
export const SUBJECT_COLORS = [
  'red',
  'orange',
  'amber',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'pink'
] as const

export type SubjectColor = (typeof SUBJECT_COLORS)[number]

export interface Subject {
  id: string
  name: string
  color: SubjectColor
}

/** A fixed weekly slot: a class (with subjectId) or a break such as recess (with a label instead). */
export interface ScheduleSlot {
  id: string
  subjectId?: string
  label?: string
  /** 1 = Monday ... 7 = Sunday */
  weekday: number
  /** "HH:mm" */
  start: string
  end: string
  room?: string
}

export const AGENDA_ITEM_TYPES = ['homework', 'exam', 'project', 'event'] as const
export type AgendaItemType = (typeof AGENDA_ITEM_TYPES)[number]

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface AgendaItem {
  id: string
  type: AgendaItemType
  title: string
  subjectId?: string
  /** "YYYY-MM-DD" */
  date: string
  /** "HH:mm" */
  time?: string
  endTime?: string
  priority: Priority
  done: boolean
  completedAt?: string
  /** Exams only: topics that will be tested */
  topics?: string
}

/** What is being created or edited: new records have no id yet, the main process assigns it. */
export type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

export const DATA_VERSION = 1

export interface AppData {
  version: typeof DATA_VERSION
  settings: Settings
  subjects: Subject[]
  schedule: ScheduleSlot[]
  items: AgendaItem[]
}

/** The part of the data the agenda screens work with. */
export type AgendaData = Pick<AppData, 'subjects' | 'schedule' | 'items'>

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  summaryTime: '17:00',
  overdueRepeatHours: 2,
  examDaysBefore: [7, 3, 1],
  quietStart: '22:00',
  quietEnd: '08:00'
}

export const DEFAULT_STUDY: StudySettings = { focusMinutes: 45, breakMinutes: 5 }

export const DEFAULT_EYE_BREAK: EyeBreakSettings = {
  enabled: true,
  intervalMinutes: 20,
  durationSeconds: 20,
  idleResetMinutes: 5
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'es',
  notifications: DEFAULT_NOTIFICATIONS,
  study: DEFAULT_STUDY,
  eyeBreak: DEFAULT_EYE_BREAK,
  startWithWindows: false
}

export const THEMES: ThemeSetting[] = ['light', 'dark', 'system']

/** Language names are shown in their own language, so they are not translated. */
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' }
]

export function createDefaultData(): AppData {
  return {
    version: DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_NOTIFICATIONS } },
    subjects: [],
    schedule: [],
    items: []
  }
}
