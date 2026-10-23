import { describe, expect, it } from 'vitest'
import {
  isQuietTime,
  overdueKey,
  planAhead,
  planNotifications,
  pruneLog,
  type SentLog
} from './notifications'
import { DEFAULT_NOTIFICATIONS, type AgendaData, type AgendaItem } from './types'

const settings = DEFAULT_NOTIFICATIONS // summary 17:00, repeat 2 h, exams 7/3/1, quiet 22:00-08:00

/** Wednesday 21 October 2026 at the given time */
const at = (time: string, day = 21): Date => {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2026, 9, day, hours, minutes)
}

const item = (
  id: string,
  type: AgendaItem['type'],
  date: string,
  extra: Partial<AgendaItem> = {}
): AgendaItem => ({ id, type, title: id, date, priority: 'medium', done: false, ...extra })

const agendaWith = (...items: AgendaItem[]): AgendaData => ({ subjects: [], schedule: [], items })

const kinds = (plan: ReturnType<typeof planNotifications>): string[] =>
  plan.notifications.map((n) => n.kind)

describe('isQuietTime', () => {
  it('handles quiet hours that wrap past midnight', () => {
    expect(isQuietTime(at('23:00'), '22:00', '08:00')).toBe(true)
    expect(isQuietTime(at('07:59'), '22:00', '08:00')).toBe(true)
    expect(isQuietTime(at('08:00'), '22:00', '08:00')).toBe(false)
    expect(isQuietTime(at('21:59'), '22:00', '08:00')).toBe(false)
  })

  it('handles quiet hours within the same day, and none when start equals end', () => {
    expect(isQuietTime(at('14:30'), '14:00', '16:00')).toBe(true)
    expect(isQuietTime(at('16:00'), '14:00', '16:00')).toBe(false)
    expect(isQuietTime(at('03:00'), '00:00', '00:00')).toBe(false)
  })
})

describe('planNotifications', () => {
  const homeworkToday = item('hw', 'homework', '2026-10-21')

  it('sends nothing when notifications are off or during quiet hours', () => {
    const late = agendaWith(item('late', 'homework', '2026-10-19'))
    expect(
      kinds(planNotifications(at('18:00'), late, { ...settings, enabled: false }, {}))
    ).toEqual([])
    expect(kinds(planNotifications(at('23:00'), late, settings, {}))).toEqual([])
  })

  it('holds everything while studying, and sends it once the study block is over', () => {
    const agenda = agendaWith(item('late', 'homework', '2026-10-19'), homeworkToday)
    const whileStudying = planNotifications(at('17:30'), agenda, settings, {}, true)
    expect(whileStudying).toEqual({ notifications: [], sentKeys: [] })
    expect(kinds(planNotifications(at('18:15'), agenda, settings, {}, false))).toEqual(['summary'])
  })

  it('sends the summary from the chosen time on, once a day', () => {
    const agenda = agendaWith(homeworkToday)
    expect(kinds(planNotifications(at('16:59'), agenda, settings, {}))).toEqual([])

    const plan = planNotifications(at('17:00'), agenda, settings, {})
    expect(kinds(plan)).toEqual(['summary'])
    expect(plan.sentKeys).toEqual(['summary:2026-10-21'])

    const log: SentLog = { 'summary:2026-10-21': at('17:00').toISOString() }
    expect(kinds(planNotifications(at('17:01'), agenda, settings, log))).toEqual([])
  })

  it('still sends the summary later if the computer was off at the summary time', () => {
    expect(kinds(planNotifications(at('19:30'), agendaWith(homeworkToday), settings, {}))).toEqual([
      'summary'
    ])
  })

  it('puts late, today and tomorrow work in the summary', () => {
    const plan = planNotifications(
      at('17:00'),
      agendaWith(
        item('late', 'homework', '2026-10-19'),
        homeworkToday,
        item('exam', 'exam', '2026-10-22'),
        item('done', 'homework', '2026-10-21', { done: true }),
        item('later', 'homework', '2026-10-25')
      ),
      settings,
      {}
    )
    const summary = plan.notifications[0]
    expect(
      summary.kind === 'summary' && {
        overdue: summary.overdue.map((i) => i.id),
        today: summary.today.map((i) => i.id),
        tomorrow: summary.tomorrow.map((i) => i.id)
      }
    ).toEqual({ overdue: ['late'], today: ['hw'], tomorrow: ['exam'] })
  })

  it('reminds about exams on the chosen days before, at summary time', () => {
    const exam = item('exam', 'exam', '2026-10-24') // 3 days after the 21st
    const log: SentLog = { 'summary:2026-10-21': at('17:00').toISOString() }
    expect(kinds(planNotifications(at('10:00'), agendaWith(exam), settings, log))).toEqual([])

    const plan = planNotifications(at('17:00'), agendaWith(exam), settings, log)
    expect(plan.notifications).toEqual([{ kind: 'exam', exam, daysLeft: 3 }])
    expect(plan.sentKeys).toEqual(['exam:exam:2026-10-24:3'])

    const notChosenDay = item('exam', 'exam', '2026-10-25') // 4 days
    expect(kinds(planNotifications(at('17:00'), agendaWith(notChosenDay), settings, log))).toEqual(
      []
    )
  })

  it('reminds about late work as soon as it is late, then every few hours', () => {
    const late = item('late', 'project', '2026-10-20')
    const agenda = agendaWith(late)

    const first = planNotifications(at('09:00'), agenda, settings, {})
    expect(first.notifications).toEqual([{ kind: 'overdue', items: [late] }])
    expect(first.sentKeys).toEqual([overdueKey(late)])

    const log: SentLog = { [overdueKey(late)]: at('09:00').toISOString() }
    expect(kinds(planNotifications(at('10:59'), agenda, settings, log))).toEqual([])
    expect(kinds(planNotifications(at('11:00'), agenda, settings, log))).toEqual(['overdue'])
    expect(
      kinds(planNotifications(at('15:00'), agenda, { ...settings, overdueRepeatHours: 0 }, log))
    ).toEqual([])
  })

  it('groups several late items, and skips done items, exams and events', () => {
    const plan = planNotifications(
      at('09:00'),
      agendaWith(
        item('a', 'homework', '2026-10-19'),
        item('b', 'project', '2026-10-20'),
        item('c', 'homework', '2026-10-18', { done: true }),
        item('d', 'exam', '2026-10-19'),
        item('e', 'event', '2026-10-19')
      ),
      settings,
      {}
    )
    expect(plan.notifications).toHaveLength(1)
    const [notification] = plan.notifications
    expect(notification.kind === 'overdue' && notification.items.map((i) => i.id)).toEqual([
      'a',
      'b'
    ])
  })

  it('does not send a separate late reminder at the same time as the summary', () => {
    const late = item('late', 'homework', '2026-10-19')
    const plan = planNotifications(at('17:00'), agendaWith(late), settings, {})
    expect(kinds(plan)).toEqual(['summary'])
    expect(plan.sentKeys).toContain(overdueKey(late))
  })

  it('reminds again when a late item gets a new date that is also past', () => {
    const late = item('late', 'homework', '2026-10-20')
    const log: SentLog = { [overdueKey(late)]: at('09:00').toISOString() }
    const moved = { ...late, date: '2026-10-19' }
    expect(kinds(planNotifications(at('09:30'), agendaWith(moved), settings, log))).toEqual([
      'overdue'
    ])
  })
})

describe('pruneLog', () => {
  it('forgets entries older than 60 days', () => {
    const now = at('12:00')
    const log = {
      old: new Date(2026, 6, 1).toISOString(),
      recent: new Date(2026, 9, 1).toISOString()
    }
    expect(Object.keys(pruneLog(log, now))).toEqual(['recent'])
  })
})

describe('planAhead', () => {
  const times = (plan: ReturnType<typeof planAhead>): string[] =>
    plan.reminders.map(({ at: time, notification }) => {
      const day = time.getDate()
      const clock = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
      return `${day} ${clock} ${notification.kind}`
    })

  it('plans the daily summary of the coming days at the summary time', () => {
    const plan = planAhead(
      at('10:00'),
      agendaWith(item('a', 'homework', '2026-10-30')),
      settings,
      {},
      {
        days: 3
      }
    )
    expect(times(plan)).toEqual(['21 17:00 summary', '22 17:00 summary', '23 17:00 summary'])
  })

  it('reminds about late work after the quiet hours and then every few hours', () => {
    // Due today: late from midnight, but the first reminder waits until 08:00
    const plan = planAhead(
      at('18:00'),
      agendaWith(item('a', 'homework', '2026-10-21')),
      settings,
      {
        'summary:2026-10-21': at('17:00').toISOString()
      },
      // Until 22:48 the next day
      { days: 1.2 }
    )
    expect(times(plan)).toEqual([
      '22 08:00 overdue',
      '22 10:00 overdue',
      '22 12:00 overdue',
      '22 14:00 overdue',
      '22 16:00 overdue',
      // The summary in between does not change the rhythm of the reminders
      '22 17:00 summary',
      '22 18:00 overdue',
      '22 20:00 overdue'
    ])
  })

  it('reminds about exams on the chosen days before, with the summary', () => {
    const exam = item('e', 'exam', '2026-10-24')
    const plan = planAhead(
      at('18:00'),
      agendaWith(exam),
      settings,
      {
        'summary:2026-10-21': at('17:00').toISOString()
      },
      { days: 3 }
    )
    // 3 days before was today, already past the summary time: it goes out right away
    expect(times(plan)).toEqual([
      '21 18:00 exam',
      '22 17:00 summary',
      '23 17:00 summary',
      '23 17:00 exam',
      '24 17:00 summary'
    ])
    expect(plan.sent.map((entry) => entry.key)).toContain('exam:e:2026-10-24:1')
  })

  it('holds reminders back until the study block ends', () => {
    const plan = planAhead(
      at('16:30'),
      agendaWith(item('a', 'homework', '2026-10-30')),
      settings,
      {},
      {
        days: 0.5,
        studyingUntil: at('17:15').getTime()
      }
    )
    expect(times(plan)).toEqual(['21 17:15 summary'])
  })

  it('plans nothing with reminders turned off, and stops at the maximum', () => {
    const agenda = agendaWith(item('a', 'homework', '2026-10-01'))
    expect(planAhead(at('10:00'), agenda, { ...settings, enabled: false }, {}).reminders).toEqual(
      []
    )
    expect(planAhead(at('10:00'), agenda, settings, {}, { max: 3 }).reminders).toHaveLength(3)
  })

  it('is quick enough to run after every change', () => {
    const many = Array.from({ length: 300 }, (_, index) =>
      item(
        `i${index}`,
        index % 3 === 0 ? 'exam' : 'homework',
        `2026-10-${String(15 + (index % 15)).padStart(2, '0')}`
      )
    )
    const started = performance.now()
    planAhead(at('10:00'), agendaWith(...many), settings, {})
    expect(performance.now() - started).toBeLessThan(500)
  })
})
