import { describe, expect, it } from 'vitest'
import { buildAppUrl, findAppUrl, parseAppUrl } from './appUrl'

describe('miestudio:// links', () => {
  it('round-trips the "done" and "open" actions', () => {
    const done = { action: 'done' as const, itemId: '3f2a-91' }
    const open = {
      action: 'open' as const,
      target: { section: 'tasks' as const, itemId: 'abc', tasksStatus: 'overdue' as const }
    }
    expect(parseAppUrl(buildAppUrl(done))).toEqual(done)
    expect(parseAppUrl(buildAppUrl(open))).toEqual(open)
  })

  it('accepts the trailing slash Windows sometimes adds', () => {
    expect(parseAppUrl('miestudio://done/?item=abc')).toEqual({ action: 'done', itemId: 'abc' })
  })

  it('ignores anything unexpected', () => {
    expect(parseAppUrl('https://example.com/done?item=abc')).toBeNull()
    expect(parseAppUrl('miestudio://delete?item=abc')).toBeNull()
    expect(parseAppUrl('miestudio://done?item=../../etc')).toBeNull()
    expect(parseAppUrl('miestudio://open?section=admin')).toBeNull()
    expect(parseAppUrl('not a url')).toBeNull()
  })

  it('finds the link among the arguments Windows passes to the app', () => {
    expect(findAppUrl(['Mi Estudio.exe', '--flag', 'miestudio://done?item=a'])).toBe(
      'miestudio://done?item=a'
    )
    expect(findAppUrl(['Mi Estudio.exe'])).toBeUndefined()
  })
})
