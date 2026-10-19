// Data model shared by the main process and the renderer (see docs/especificacion.md, section 3)

export type ThemeSetting = 'light' | 'dark' | 'system'
export type Language = 'es' | 'en' | 'zh-CN'

export interface Settings {
  theme: ThemeSetting
  language: Language
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

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'es'
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
    settings: { ...DEFAULT_SETTINGS },
    subjects: [],
    schedule: [],
    items: []
  }
}
