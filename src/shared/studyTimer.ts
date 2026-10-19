import type { StudySettings } from './types'

export type StudyPhase = 'focus' | 'break'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type TimerCommand = 'start' | 'pause' | 'skip' | 'reset'
/** What happened when the clock moved on; used for the chime and the notification */
export type PhaseEvent = 'breakStarted' | 'breakEnded'

export interface TimerState {
  status: TimerStatus
  phase: StudyPhase
  /** Number of the study block: 1, 2, 3... */
  block: number
  /** When the current phase ends (ms since 1970), only while running */
  endsAt: number | null
  /** Time left while idle or paused */
  remainingMs: number
  /** Full length of the current phase, for the progress ring */
  durationMs: number
}

const MINUTE_MS = 60_000

function phaseMs(phase: StudyPhase, durations: StudySettings): number {
  return (phase === 'focus' ? durations.focusMinutes : durations.breakMinutes) * MINUTE_MS
}

/** A study block waiting to start. */
function readyToFocus(block: number, durations: StudySettings): TimerState {
  const ms = phaseMs('focus', durations)
  return { status: 'idle', phase: 'focus', block, endsAt: null, remainingMs: ms, durationMs: ms }
}

export function createTimer(durations: StudySettings): TimerState {
  return readyToFocus(1, durations)
}

/** The break starts right away, counting from `from` (when the study block ended). */
function startBreak(state: TimerState, from: number, durations: StudySettings): TimerState {
  const ms = phaseMs('break', durations)
  return {
    ...state,
    status: 'running',
    phase: 'break',
    endsAt: from + ms,
    remainingMs: ms,
    durationMs: ms
  }
}

export function remainingMs(state: TimerState, now: number): number {
  return state.status === 'running' && state.endsAt !== null
    ? Math.max(0, state.endsAt - now)
    : state.remainingMs
}

/** Only time actually spent studying silences the notifications (not breaks, not pauses). */
export function isStudying(state: TimerState): boolean {
  return state.status === 'running' && state.phase === 'focus'
}

export function applyCommand(
  state: TimerState,
  command: TimerCommand,
  now: number,
  durations: StudySettings
): { state: TimerState; events: PhaseEvent[] } {
  switch (command) {
    case 'start':
      if (state.status === 'running') return { state, events: [] }
      return { state: { ...state, status: 'running', endsAt: now + state.remainingMs }, events: [] }

    case 'pause':
      if (state.status !== 'running') return { state, events: [] }
      return {
        state: { ...state, status: 'paused', endsAt: null, remainingMs: remainingMs(state, now) },
        events: []
      }

    case 'skip':
      // Skipping study goes straight to the break; skipping the break gets the next block ready
      return state.phase === 'focus'
        ? { state: startBreak(state, now, durations), events: ['breakStarted'] }
        : { state: readyToFocus(state.block + 1, durations), events: ['breakEnded'] }

    case 'reset':
      return { state: createTimer(durations), events: [] }
  }
}

/**
 * Moves the timer on when the current phase has run out. A finished study block starts the
 * break; a finished break leaves the next block waiting for "Start". If the computer slept
 * through both, both happen.
 */
export function advance(
  state: TimerState,
  now: number,
  durations: StudySettings
): { state: TimerState; events: PhaseEvent[] } {
  let current = state
  const events: PhaseEvent[] = []
  while (current.status === 'running' && current.endsAt !== null && now >= current.endsAt) {
    if (current.phase === 'focus') {
      current = startBreak(current, current.endsAt, durations)
      events.push('breakStarted')
    } else {
      current = readyToFocus(current.block + 1, durations)
      events.push('breakEnded')
    }
  }
  return { state: current, events }
}

/** New lengths from the settings: applied right away only if nothing is counting down. */
export function withDurations(state: TimerState, durations: StudySettings): TimerState {
  if (state.status !== 'idle') return state
  return readyToFocus(state.block, durations)
}
