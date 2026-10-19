import { describe, expect, it } from 'vitest'
import {
  advance,
  applyCommand,
  createTimer,
  isStudying,
  remainingMs,
  withDurations,
  type TimerState
} from './studyTimer'

const durations = { focusMinutes: 45, breakMinutes: 5 }
const MIN = 60_000
const t0 = 1_000_000

/** Applies commands one after another: run(timer, ['start', t0], ['pause', t1]) */
const run = (
  state: TimerState,
  ...steps: [Parameters<typeof applyCommand>[1], number][]
): TimerState =>
  steps.reduce(
    (current, [command, at]) => applyCommand(current, command, at, durations).state,
    state
  )

describe('study timer', () => {
  it('starts as a 45-minute study block waiting to begin', () => {
    const timer = createTimer(durations)
    expect(timer).toMatchObject({ status: 'idle', phase: 'focus', block: 1, remainingMs: 45 * MIN })
    expect(isStudying(timer)).toBe(false)
  })

  it('counts down while running and keeps the time left when paused', () => {
    const running = run(createTimer(durations), ['start', t0])
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
    const running = run(createTimer(durations), ['start', t0])
    expect(advance(running, t0 + 44 * MIN, durations).events).toEqual([])

    const { state, events } = advance(running, t0 + 45 * MIN + 500, durations)
    expect(events).toEqual(['breakStarted'])
    expect(state).toMatchObject({ status: 'running', phase: 'break', block: 1 })
    // The break counts from when the block ended, not from when it was noticed
    expect(remainingMs(state, t0 + 46 * MIN)).toBe(4 * MIN)
  })

  it('waits for "start" after the break, with the next block ready', () => {
    const onBreak = advance(
      run(createTimer(durations), ['start', t0]),
      t0 + 45 * MIN,
      durations
    ).state
    const { state, events } = advance(onBreak, t0 + 50 * MIN, durations)
    expect(events).toEqual(['breakEnded'])
    expect(state).toMatchObject({ status: 'idle', phase: 'focus', block: 2, remainingMs: 45 * MIN })
  })

  it('catches up if the computer slept through the block and the break', () => {
    const running = run(createTimer(durations), ['start', t0])
    const { state, events } = advance(running, t0 + 3 * 60 * MIN, durations)
    expect(events).toEqual(['breakStarted', 'breakEnded'])
    expect(state.status).toBe('idle')
  })

  it('skips to the break, then to the next block', () => {
    const running = run(createTimer(durations), ['start', t0])
    const skipped = applyCommand(running, 'skip', t0 + 5 * MIN, durations)
    expect(skipped.events).toEqual(['breakStarted'])
    expect(skipped.state).toMatchObject({ phase: 'break', status: 'running' })

    const next = applyCommand(skipped.state, 'skip', t0 + 6 * MIN, durations)
    expect(next.events).toEqual(['breakEnded'])
    expect(next.state).toMatchObject({ phase: 'focus', status: 'idle', block: 2 })
  })

  it('resets to the first block', () => {
    const timer = run(
      createTimer(durations),
      ['start', t0],
      ['skip', t0 + MIN],
      ['reset', t0 + 2 * MIN]
    )
    expect(timer).toEqual(createTimer(durations))
  })

  it('uses new lengths right away only when nothing is counting down', () => {
    const shorter = { focusMinutes: 25, breakMinutes: 5 }
    expect(withDurations(createTimer(durations), shorter).remainingMs).toBe(25 * MIN)
    const running = run(createTimer(durations), ['start', t0])
    expect(withDurations(running, shorter)).toBe(running)
  })
})
