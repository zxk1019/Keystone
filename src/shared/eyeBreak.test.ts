import { describe, expect, it } from 'vitest'
import {
  createEyeBreak,
  deferEyeBreak,
  eyeBreakStatus,
  RETRY_AFTER_MS,
  tickEyeBreak,
  type EyeBreakState,
  type TickInput
} from './eyeBreak'
import { applyCommand, createTimer, type StudyPlan, type TimerState } from './studyTimer'
import { DEFAULT_EYE_BREAK } from './types'

const MIN = 60_000
const plan: StudyPlan = { focusMs: 45 * MIN, breakMs: 5 * MIN, eyeRest: false }
const idleTimer = createTimer(plan)

/** Ticks of 10 s for `minutes` of active use, starting at `start` */
function useComputer(
  state: EyeBreakState,
  minutes: number,
  overrides: Partial<TickInput> = {},
  start = 0
): { state: EyeBreakState; shows: number[] } {
  let current = state
  const shows: number[] = []
  for (let t = 10_000; t <= minutes * MIN; t += 10_000) {
    const now = start + t
    const result = tickEyeBreak(current, {
      now,
      elapsedMs: 10_000,
      idleSeconds: 0,
      settings: DEFAULT_EYE_BREAK,
      study: idleTimer,
      ...overrides
    })
    current = result.state
    if (result.show) {
      shows.push(now)
      // The dark screen appears and is done right away in this test
      current = { ...current, activeMs: 0 }
    }
  }
  return { state: current, shows }
}

describe('tickEyeBreak', () => {
  it('asks for an eye break every 20 minutes of use', () => {
    const { shows } = useComputer(createEyeBreak(), 45)
    expect(shows).toEqual([20 * MIN, 40 * MIN])
  })

  it('starts counting again after 5 minutes without mouse or keyboard', () => {
    const halfway = useComputer(createEyeBreak(), 15).state
    const rested = tickEyeBreak(halfway, {
      now: 16 * MIN,
      elapsedMs: 10_000,
      idleSeconds: 5 * 60,
      settings: DEFAULT_EYE_BREAK,
      study: idleTimer
    }).state
    expect(rested.activeMs).toBe(0)
  })

  it('does nothing while turned off, paused or already showing', () => {
    expect(
      useComputer(createEyeBreak(), 30, { settings: { ...DEFAULT_EYE_BREAK, enabled: false } })
        .shows
    ).toEqual([])
    expect(useComputer({ ...createEyeBreak(), pause: 'restart' }, 30).shows).toEqual([])
    expect(
      useComputer({ ...createEyeBreak(), showing: true, activeMs: 30 * MIN }, 1).shows
    ).toEqual([])
  })

  it('counts again from zero once a timed pause is over', () => {
    const paused = { ...createEyeBreak(), pause: { until: 30 * MIN } }
    const { state, shows } = useComputer(paused, 55)
    expect(shows).toEqual([50 * MIN])
    expect(state.pause).toBeNull()
  })

  it('treats a study break as rest', () => {
    const running = applyCommand(idleTimer, 'start', 0, plan).state
    const onBreak: TimerState = applyCommand(running, 'skip', 0, plan).state
    const { state, shows } = useComputer(createEyeBreak(), 25, { study: onBreak })
    expect(shows).toEqual([])
    expect(state.activeMs).toBe(0)
  })

  it('leaves the eyes to the timer while it runs the 20-20-20', () => {
    const eyes = { focusMs: 20 * MIN, breakMs: 20_000, eyeRest: true }
    const studying = applyCommand(createTimer(eyes), 'start', 0, eyes).state
    const { state, shows } = useComputer(createEyeBreak(), 40, { study: studying })
    expect(shows).toEqual([])
    expect(state.activeMs).toBe(0)

    // Paused, the timer sends no one to look away, so the dark screen does
    const paused = applyCommand(studying, 'pause', 0, eyes).state
    expect(useComputer(createEyeBreak(), 21, { study: paused }).shows).toHaveLength(1)
  })

  it('waits when the study break is less than 2 minutes away', () => {
    // Study block started at minute 0 and ends at minute 21
    const studying = applyCommand(
      createTimer({ ...plan, focusMs: 21 * MIN }),
      'start',
      0,
      plan
    ).state
    const { shows } = useComputer(createEyeBreak(), 20.5, { study: studying })
    expect(shows).toEqual([])
  })

  it('tries again 2 minutes later if a full-screen game was on', () => {
    const due = { ...createEyeBreak(), activeMs: 20 * MIN }
    const deferred = deferEyeBreak(due, 0)
    const tick = (now: number): boolean =>
      tickEyeBreak(deferred, {
        now,
        elapsedMs: 10_000,
        idleSeconds: 0,
        settings: DEFAULT_EYE_BREAK,
        study: idleTimer
      }).show
    expect(tick(RETRY_AFTER_MS - 1000)).toBe(false)
    expect(tick(RETRY_AFTER_MS)).toBe(true)
  })
})

describe('eyeBreakStatus', () => {
  it('says how long until the next eye break and whether it is paused', () => {
    const status = eyeBreakStatus(
      { ...createEyeBreak(), activeMs: 8 * MIN, pause: { until: 100 } },
      DEFAULT_EYE_BREAK,
      200
    )
    expect(status).toEqual({ enabled: true, nextInMs: 12 * MIN, pause: null, showing: false })
  })
})
