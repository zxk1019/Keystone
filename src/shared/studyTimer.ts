import type { Settings, StudyMode } from './types'

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
  /** The 20-20-20: the break is for looking far away (see StudyPlan) */
  eyeRest: boolean
}

/** How long the study blocks and breaks last. */
export interface StudyPlan {
  focusMs: number
  breakMs: number
  /** 20-20-20: the 20-second break only rests the eyes, so the next block starts by itself */
  eyeRest: boolean
}

const MINUTE_MS = 60_000

const PLANS: Record<Exclude<StudyMode, 'custom'>, StudyPlan> = {
  computer: { focusMs: 20 * MINUTE_MS, breakMs: 20_000, eyeRest: true },
  noComputer: { focusMs: 45 * MINUTE_MS, breakMs: 5 * MINUTE_MS, eyeRest: false }
}

/** The plan of the chosen mode; `deviceMode` until the user picks one on this device. */
export function studyPlan(
  { study, studyMode }: Pick<Settings, 'study' | 'studyMode'>,
  deviceMode: StudyMode
): StudyPlan {
  const mode = studyMode ?? deviceMode
  if (mode !== 'custom') return PLANS[mode]
  return {
    focusMs: study.focusMinutes * MINUTE_MS,
    breakMs: study.breakMinutes * MINUTE_MS,
    eyeRest: false
  }
}

/** A study block waiting to start. */
function readyToFocus(block: number, plan: StudyPlan): TimerState {
  const ms = plan.focusMs
  return {
    status: 'idle',
    phase: 'focus',
    block,
    endsAt: null,
    remainingMs: ms,
    durationMs: ms,
    eyeRest: plan.eyeRest
  }
}

/** The next study block starts right away, counting from `from` (when the break ended). */
function startFocus(block: number, from: number, plan: StudyPlan): TimerState {
  const ready = readyToFocus(block, plan)
  return { ...ready, status: 'running', endsAt: from + ready.durationMs }
}

export function createTimer(plan: StudyPlan): TimerState {
  return readyToFocus(1, plan)
}

/** The break starts right away, counting from `from` (when the study block ended). */
function startBreak(state: TimerState, from: number, plan: StudyPlan): TimerState {
  const ms = plan.breakMs
  return {
    ...state,
    status: 'running',
    phase: 'break',
    endsAt: from + ms,
    remainingMs: ms,
    durationMs: ms,
    eyeRest: plan.eyeRest
  }
}

/** After a break: a new block waiting for "Start", or already counting with the 20-20-20. */
function afterBreak(state: TimerState, from: number, plan: StudyPlan): TimerState {
  return plan.eyeRest
    ? startFocus(state.block + 1, from, plan)
    : readyToFocus(state.block + 1, plan)
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
  plan: StudyPlan
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
      // Skipping study goes straight to the break; skipping the break goes to the next block
      return state.phase === 'focus'
        ? { state: startBreak(state, now, plan), events: ['breakStarted'] }
        : { state: afterBreak(state, now, plan), events: ['breakEnded'] }

    case 'reset':
      return { state: createTimer(plan), events: [] }
  }
}

/**
 * Moves the timer on when the current phase has run out. A finished study block starts the
 * break; a finished break leaves the next block waiting for "Start" (with the 20-20-20, the
 * next block starts by itself). If the computer slept through several, they all happen.
 */
export function advance(
  state: TimerState,
  now: number,
  plan: StudyPlan
): { state: TimerState; events: PhaseEvent[] } {
  let current = state
  const events: PhaseEvent[] = []
  while (current.status === 'running' && current.endsAt !== null && now >= current.endsAt) {
    if (current.phase === 'focus') {
      current = startBreak(current, current.endsAt, plan)
      events.push('breakStarted')
    } else {
      current = afterBreak(current, current.endsAt, plan)
      events.push('breakEnded')
    }
  }
  // The 20-20-20 never stops: after a long sleep only the last change matters (one chime)
  return { state: current, events: plan.eyeRest ? events.slice(-1) : events }
}

/** A new plan from the settings: applied right away only if nothing is counting down. */
export function withPlan(state: TimerState, plan: StudyPlan): TimerState {
  if (state.status !== 'idle') return state
  return readyToFocus(state.block, plan)
}
