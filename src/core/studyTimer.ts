import {
  advance,
  applyCommand,
  createTimer,
  withDurations,
  type PhaseEvent,
  type TimerCommand,
  type TimerState
} from '@shared/studyTimer'
import type { StudySettings } from '@shared/types'

interface StudyTimerDeps {
  durations: () => StudySettings
  onChange: (state: TimerState) => void
  onPhaseEvent: (event: PhaseEvent, state: TimerState) => void
}

/**
 * The study timer. On the PC it lives in the main process: it keeps exact time with the window
 * hidden (Chromium slows down timers in hidden windows) and the notifier needs to know about
 * it. On the phone it runs in the app, which calls `catchUp` when it comes back to the front.
 */
export class StudyTimer {
  private state: TimerState
  private timeout: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly deps: StudyTimerDeps) {
    this.state = createTimer(deps.durations())
  }

  get(): TimerState {
    return this.state
  }

  command(command: TimerCommand): TimerState {
    const { state, events } = applyCommand(this.state, command, Date.now(), this.deps.durations())
    this.update(state, events)
    return this.state
  }

  /** Moves on to the right phase after the app was paused (the phone puts apps to sleep). */
  catchUp(): void {
    this.tick()
  }

  /** Called when the settings change. */
  durationsChanged(): void {
    const state = withDurations(this.state, this.deps.durations())
    if (state !== this.state) this.update(state, [])
  }

  private update(state: TimerState, events: PhaseEvent[]): void {
    this.state = state
    this.schedule()
    this.deps.onChange(state)
    for (const event of events) this.deps.onPhaseEvent(event, state)
  }

  /** Wakes up exactly when the current phase ends. */
  private schedule(): void {
    clearTimeout(this.timeout)
    const { status, endsAt } = this.state
    if (status !== 'running' || endsAt === null) return
    // A few ms late on purpose, so the phase has surely ended when the check runs
    this.timeout = setTimeout(() => this.tick(), Math.max(0, endsAt - Date.now()) + 50)
  }

  private tick(): void {
    const { state, events } = advance(this.state, Date.now(), this.deps.durations())
    if (events.length > 0) this.update(state, events)
    else this.schedule()
  }
}
