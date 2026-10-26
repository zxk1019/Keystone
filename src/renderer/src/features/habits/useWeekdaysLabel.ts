import { useTranslation } from 'react-i18next'
import { weekdayName } from '../../lib/dates'

const WEEKDAYS_ONLY = [1, 2, 3, 4, 5]

/** "Todos los días", "De lunes a viernes" or "Lun, Mié, Vie". */
export function useWeekdaysLabel(): (weekdays: number[]) => string {
  const { t, i18n } = useTranslation()
  return (weekdays) => {
    if (weekdays.length === 7) return t('habits.everyDay')
    if (weekdays.join() === WEEKDAYS_ONLY.join()) return t('habits.weekdaysOnly')
    return weekdays.map((day) => weekdayName(day, i18n.language, 'short')).join(', ')
  }
}
