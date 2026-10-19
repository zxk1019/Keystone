import { describe, expect, it } from 'vitest'
import {
  datesOfWeek,
  formatDateRange,
  formatMonth,
  isoWeekday,
  monthGrid,
  startOfSchoolWeek,
  toDateKey,
  weekdayName
} from './dates'

describe('weeks', () => {
  it('start on Monday', () => {
    // Wednesday 21 October 2026
    expect(toDateKey(startOfSchoolWeek(new Date(2026, 9, 21)))).toBe('2026-10-19')
    // A Sunday belongs to the week that started the Monday before
    expect(toDateKey(startOfSchoolWeek(new Date(2026, 9, 25)))).toBe('2026-10-19')
  })

  it('give the dates of the chosen weekdays', () => {
    const monday = new Date(2026, 9, 19)
    expect(datesOfWeek(monday, [1, 2, 3, 4, 5]).map(toDateKey)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23'
    ])
    expect(isoWeekday(new Date(2026, 9, 25))).toBe(7)
  })
})

describe('monthGrid', () => {
  it('covers the month with full weeks from Monday to Sunday', () => {
    // October 2026 starts on a Thursday and ends on a Saturday
    const weeks = monthGrid(new Date(2026, 9, 15))
    expect(weeks).toHaveLength(5)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(toDateKey(weeks[0][0])).toBe('2026-09-28')
    expect(toDateKey(weeks[4][6])).toBe('2026-11-01')
  })
})

describe('names in each language', () => {
  it('names weekdays starting with a capital letter', () => {
    expect(weekdayName(1, 'es', 'short')).toBe('Lun')
    expect(weekdayName(1, 'es', 'long')).toBe('Lunes')
    expect(weekdayName(7, 'en', 'long')).toBe('Sunday')
    expect(weekdayName(1, 'zh-CN', 'short')).toBe('周一')
  })

  it('names week ranges', () => {
    const monday = new Date(2026, 9, 19)
    const friday = new Date(2026, 9, 23)
    expect(formatDateRange(monday, friday, 'es')).toBe('19–23 oct 2026')
    // English puts thin spaces (U+2009) around the dash
    expect(formatDateRange(monday, friday, 'en')).toBe('Oct 19 – 23, 2026')
    expect(formatDateRange(monday, friday, 'zh-CN')).toBe('2026年10月19日 – 10月23日')
    expect(formatDateRange(new Date(2026, 11, 28), new Date(2027, 0, 1), 'zh-CN')).toBe(
      '2026年12月28日 – 2027年1月1日'
    )
  })

  it('names months', () => {
    expect(formatMonth(new Date(2026, 9, 1), 'en')).toBe('October 2026')
    expect(formatMonth(new Date(2026, 9, 1), 'zh-CN')).toBe('2026年10月')
  })
})
