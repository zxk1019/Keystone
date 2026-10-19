// Data model shared by the main process and the renderer (see docs/especificacion.md, section 3)

export type ThemeSetting = 'light' | 'dark' | 'system'
export type Language = 'es' | 'en' | 'zh-CN'

export interface Settings {
  theme: ThemeSetting
  language: Language
}

export interface Subject {
  id: string
  name: string
  color: string
}

/** A fixed weekly slot: a class (with subjectId) or a break such as recess (without it). */
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

export type AgendaItemType = 'homework' | 'exam' | 'project' | 'event'
export type Priority = 'high' | 'medium' | 'low'

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

export const DATA_VERSION = 1

export interface AppData {
  version: typeof DATA_VERSION
  settings: Settings
  subjects: Subject[]
  schedule: ScheduleSlot[]
  items: AgendaItem[]
}

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
