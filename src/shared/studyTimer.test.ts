import { describe, expect, it } from 'vitest'
import {
  advance,
  applyCommand,
  createTimer,
  isStudying,
  remainingMs,
  studyPlan,
  withPlan,
  type StudyPlan,
  type TimerState
} from './studyTimer'

const MIN = 60_000
const plan: StudyPlan = { focusMs: 45 * MIN, breakMs: 5 * MIN, eyeRest: false }
const t0 = 1_000_000

/** Applies commands one after another: run(timer, ['start', t0], ['pause', t1]) */
const run = (
  state: TimerState,
  ...steps: [Parameters<typeof applyCommand>[1], number][]
): TimerState =>
  steps.reduce((current, [command, at]) => applyCommand(current, command, at, plan).state, state)

describe('study timer', () => {
  it('starts as a 45-minute study block waiting to begin', () => {
    const timer = createTimer(plan)
    expect(timer).toMatchObject({ status: 'idle', phase: 'focus', block: 1, remainingMs: 45 * MIN })
    expect(isStudying(timer)).toBe(false)
  })

  it('counts down while running and keeps the time left when paused', () => {
    const running = run(createTimer(plan), ['start', t0])
    expect(isStudying(running)).toBe(true)
    expect(remainingMs(running, t0 + 10 * MIN)).toBe(35 * MIN)

    const paused = run(running, ['pause', t0 + 10 * MIN])
    expect(paused.status).toBe('paused')
    expect(isStudying(paused)).toBe(false)
    expect(remainingMs(paused, t0 + 60 * MIN)).toBe(35 * MIN)

    const resumed = run(paused, ['start', t0 + 60 * MIN])
    expect(remainingMs(resumed, t0 + 70 * MIN)).toBe(25 * MIN)
  })

  it('starts the break by itself when the study block ends', () => {
    const running = run(createTimer(plan), ['start', t0])
    expect(advance(running, t0 + 44 * MIN, plan).events).toEqual([])

    const { state, events } = advance(running, t0 + 45 * MIN + 500, plan)
    expect(events).toEqual(['breakStarted'])
    expect(state).toMatchObject({ status: 'running', phase: 'break', block: 1 })
    // The break counts from when the block ended, not from when it was noticed
    expect(remainingMs(state, t0 + 46 * MIN)).toBe(4 * MIN)
  })

  it('waits for "start" after the break, with the next block ready', () => {
    const onBreak = advance(run(createTimer(plan), ['start', t0]), t0 + 45 * MIN, plan).state
    const { state, events } = advance(onBreak, t0 + 50 * MIN, plan)
    expect(events).toEqual(['breakEnded'])
    expect(state).toMatchObject({ status: 'idle', phase: 'focus', block: 2, remainingMs: 45 * MIN })
  })

  it('catches up if the computer slept through the block and the break', () => {
    const running = run(createTimer(plan), ['start', t0])
    const { state, events } = advance(running, t0 + 3 * 60 * MIN, plan)
    expect(events).toEqual(['breakStarted', 'breakEnded'])
    expect(state.status).toBe('idle')
  })

  it('skips to the break, then to the next block', () => {
    const running = run(createTimer(plan), ['start', t0])
    const skipped = applyCommand(running, 'skip', t0 + 5 * MIN, plan)
    expect(skipped.events).toEqual(['breakStarted'])
    expect(skipped.state).toMatchObject({ phase: 'break', status: 'running' })

    const next = applyCommand(skipped.state, 'skip', t0 + 6 * MIN, plan)
    expect(next.events).toEqual(['breakEnded'])
    expect(next.state).toMatchObject({ phase: 'focus', status: 'idle', block: 2 })
  })

  it('resets to the first block', () => {
    const timer = run(createTimer(plan), ['start', t0], ['skip', t0 + MIN], ['reset', t0 + 2 * MIN])
    expect(timer).toEqual(createTimer(plan))
  })

  it('uses new lengths right away only when nothing is counting down', () => {
    const shorter = { ...plan, focusMs: 25 * MIN }
    expect(withPlan(createTimer(plan), shorter).remainingMs).toBe(25 * MIN)
    const running = run(createTimer(plan), ['start', t0])
    expect(withPlan(running, shorter)).toBe(running)
  })
})

describe('study modes', () => {
  const custom = { focusMinutes: 30, breakMinutes: 10 }

  it('uses the mode of the device until one is chosen', () => {
    expect(studyPlan({ study: custom, studyMode: null }, 'computer')).toEqual({
      focusMs: 20 * MIN,
      breakMs: 20_000,
      eyeRest: true
    })
    expect(studyPlan({ study: custom, studyMode: null }, 'noComputer')).toEqual(plan)
    expect(studyPlan({ study: custom, studyMode: 'custom' }, 'computer')).toEqual({
      focusMs: 30 * MIN,
      breakMs: 10 * MIN,
      eyeRest: false
    })
  })

  describe('20-20-20', () => {
    const eyes = studyPlan({ study: custom, studyMode: 'computer' }, 'computer')
    const running = run(createTimer(eyes), ['start', t0])

    it('looks away for 20 seconds and goes on studying by itself', () => {
      const onBreak = advance(running, t0 + 20 * MIN, eyes)
      expect(onBreak.events).toEqual(['breakStarted'])
      expect(onBreak.state).toMatchObject({ phase: 'break', eyeRest: true, durationMs: 20_000 })

      const next = advance(onBreak.state, t0 + 20 * MIN + 20_000, eyes)
      expect(next.events).toEqual(['breakEnded'])
      expect(next.state).toMatchObject({ status: 'running', phase: 'focus', block: 2 })
      expect(isStudying(next.state)).toBe(true)
      expect(remainingMs(next.state, t0 + 21 * MIN + 20_000)).toBe(19 * MIN)
    })

    it('skipping the 20 seconds starts the next block right away', () => {
      const onBreak = applyCommand(running, 'skip', t0 + MIN, eyes).state
      const next = applyCommand(onBreak, 'skip', t0 + MIN + 5000, eyes)
      expect(next.state).toMatchObject({ status: 'running', phase: 'focus', block: 2 })
      expect(next.state.endsAt).toBe(t0 + 21 * MIN + 5000)
    })

    it('after a long sleep, catches up with a single change', () => {
      // Three hours: several blocks went by, and it is in the middle of one now
      const { state, events } = advance(running, t0 + 3 * 60 * MIN, eyes)
      expect(events).toEqual(['breakEnded'])
      expect(state).toMatchObject({ status: 'running', phase: 'focus' })
      expect(state.block).toBeGreaterThan(8)
      expect(state.endsAt).toBeGreaterThan(t0 + 3 * 60 * MIN)
    })
  })
})
