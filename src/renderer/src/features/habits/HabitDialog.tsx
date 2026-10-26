import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { Habit, SubjectColor } from '@shared/types'
import { MAX_NAME_LENGTH } from '@shared/validation'
import Button from '../../components/Button'
import ColorPicker from '../../components/ColorPicker'
import Dialog from '../../components/Dialog'
import Field from '../../components/Field'
import { inputClass } from '../../components/styles'
import { suggestColor } from '../../lib/colors'
import { weekdayName } from '../../lib/dates'
import { useHabitsStore } from '../../store/habitsStore'

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

interface HabitDialogProps {
  /** Missing when creating a new habit */
  habit?: Habit
  /** All habits, to suggest a color nobody uses yet */
  habits: Habit[]
  /** Days marked so far, deleted together with the habit */
  markCount: number
  onClose: () => void
}

export default function HabitDialog({
  habit,
  habits,
  markCount,
  onClose
}: HabitDialogProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const save = useHabitsStore((state) => state.save)
  const remove = useHabitsStore((state) => state.remove)
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState<SubjectColor>(
    habit?.color ?? suggestColor(habits.map((other) => other.color))
  )
  const [weekdays, setWeekdays] = useState(habit?.weekdays ?? ALL_DAYS)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const toggleDay = (day: number): void => {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((other) => other !== day)
        : [...current, day].sort((a, b) => a - b)
    )
    setError(null)
  }

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      setError(t('habits.nameRequired'))
      return
    }
    if (weekdays.length === 0) {
      setError(t('habits.daysRequired'))
      return
    }
    await save({ id: habit?.id, name: name.trim(), color, weekdays })
    onClose()
  }

  const handleDelete = async (): Promise<void> => {
    if (habit) await remove(habit.id)
    onClose()
  }

  const footer = confirmingDelete ? (
    <>
      <Button onClick={() => setConfirmingDelete(false)}>{t('common.cancel')}</Button>
      <Button variant="danger" icon={Trash2} onClick={handleDelete}>
        {t('common.confirmDelete')}
      </Button>
    </>
  ) : (
    <>
      {habit && (
        <Button
          variant="dangerGhost"
          icon={Trash2}
          onClick={() => setConfirmingDelete(true)}
          className="mr-auto"
        >
          {t('common.delete')}
        </Button>
      )}
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" type="submit">
        {t('common.save')}
      </Button>
    </>
  )

  return (
    <Dialog
      title={habit ? t('habits.edit') : t('habits.new')}
      onClose={onClose}
      onSubmit={handleSave}
      footer={footer}
    >
      {confirmingDelete ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          {t('habits.deleteConfirm', { name: habit?.name, count: markCount })}
        </p>
      ) : (
        <>
          <Field label={t('habits.name')}>
            <input
              data-autofocus
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('habits.namePlaceholder')}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{t('habits.days')}</span>
            <div className="grid grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const selected = weekdays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={weekdayName(day, i18n.language, 'long')}
                    onClick={() => toggleDay(day)}
                    className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                        : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {weekdayName(day, i18n.language, 'short')}
                  </button>
                )
              })}
            </div>
          </div>

          <ColorPicker label={t('habits.color')} value={color} onChange={setColor} />

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </>
      )}
    </Dialog>
  )
}
