import { remainingMs, type TimerState } from './studyTimer'
import type { EyeBreakSettings } from './types'

/** Paused until a moment (ms since 1970), until the app restarts, or not paused */
export type EyeBreakPause = { until: number } | 'restart' | null

export interface EyeBreakState {
  /** Time of computer use since the last eye break */
  activeMs: number
  pause: EyeBreakPause
  /** The dark screen is up right now */
  showing: boolean
  /** A full-screen game or presentation was on: try again from this moment */
  retryAt: number | null
}

/** What the screens show about the 20-20-20 */
export interface EyeBreakStatus {
  enabled: boolean
  nextInMs: number
  pause: EyeBreakPause
  showing: boolean
}

export interface TickInput {
  now: number
  /** Time since the previous tick */
  elapsedMs: number
  /** Seconds since the last mouse or keyboard input */
  idleSeconds: number
  settings: EyeBreakSettings
  study: TimerState
}

/** No eye break this close to a study break: the study break already rests the eyes */
export const STUDY_BREAK_MARGIN_MS = 2 * 60_000
/** How long to wait after finding a full-screen game or presentation */
export const RETRY_AFTER_MS = 2 * 60_000

export function createEyeBreak(): EyeBreakState {
  return { activeMs: 0, pause: null, showing: false, retryAt: null }
}

/** Back to zero: after an eye break, a study break, a locked screen... */
export function restartCount(state: EyeBreakState): EyeBreakState {
  return { ...state, activeMs: 0, retryAt: null }
}

function isPaused(pause: EyeBreakPause, now: number): boolean {
  return pause === 'restart' || (pause !== null && pause.until > now)
}

/**
 * Called every few seconds. Adds up time of computer use and says when the dark screen
 * should show. Rests reset the count: not using the computer for a while, or a study break.
 */
export function tickEyeBreak(
  state: EyeBreakState,
  input: TickInput
): { state: EyeBreakState; show: boolean } {
  const { now, elapsedMs, idleSeconds, settings, study } = input
  const none = (next: EyeBreakState): { state: EyeBreakState; show: boolean } => ({
    state: next,
    show: false
  })

  if (state.showing) return none(state)
  if (!settings.enabled) return none(restartCount(state))

  // While paused nothing counts. When a pause ends, counting starts from zero on the next tick
  // (the time since the previous tick was still paused).
  if (state.pause !== null) {
    return none(restartCount(isPaused(state.pause, now) ? state : { ...state, pause: null }))
  }

  const studyBreak = study.status === 'running' && study.phase === 'break'
  if (idleSeconds >= settings.idleResetMinutes * 60 || studyBreak) {
    return none(restartCount(state))
  }

  const counted = { ...state, activeMs: state.activeMs + elapsedMs }
  if (counted.activeMs < settings.intervalMinutes * 60_000) return none(counted)

  const studyBreakSoon =
    study.status === 'running' &&
    study.phase === 'focus' &&
    remainingMs(study, now) < STUDY_BREAK_MARGIN_MS
  if (studyBreakSoon) return none(counted)
  if (counted.retryAt !== null && now < counted.retryAt) return none(counted)

  return { state: counted, show: true }
}

/** A full-screen game or presentation is on: keep the count and try again a bit later. */
export function deferEyeBreak(state: EyeBreakState, now: number): EyeBreakState {
  return { ...state, retryAt: now + RETRY_AFTER_MS }
}

export function eyeBreakStatus(
  state: EyeBreakState,
  settings: EyeBreakSettings,
  now: number
): EyeBreakStatus {
  return {
    enabled: settings.enabled,
    nextInMs: Math.max(0, settings.intervalMinutes * 60_000 - state.activeMs),
    pause: isPaused(state.pause, now) ? state.pause : null,
    showing: state.showing
  }
}
