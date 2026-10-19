import { useMemo, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { findOverlap, timeToMinutes } from '@shared/schedule'
import { MAX_NAME_LENGTH, MAX_ROOM_LENGTH } from '@shared/validation'
import type { Draft, ScheduleSlot, Subject } from '@shared/types'
import Button from '../../components/Button'
import Dialog from '../../components/Dialog'
import Field from '../../components/Field'
import { inputClass, segmentClass, segmentedClass } from '../../components/styles'
import { weekdayName } from '../../lib/dates'
import { slotTitle } from '../../lib/scheduleLayout'
import { useAgendaStore } from '../../store/agendaStore'

type Kind = 'class' | 'break'

interface SlotDialogProps {
  /** An existing slot (has an id) or the starting values for a new one */
  initial: Draft<ScheduleSlot>
  subjects: Subject[]
  schedule: ScheduleSlot[]
  onClose: () => void
}

export default function SlotDialog({
  initial,
  subjects,
  schedule,
  onClose
}: SlotDialogProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const saveSlot = useAgendaStore((state) => state.saveSlot)
  const deleteSlot = useAgendaStore((state) => state.deleteSlot)
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])

  const isEditing = Boolean(initial.id)
  const [kind, setKind] = useState<Kind>(
    initial.label || (!initial.subjectId && subjects.length === 0) ? 'break' : 'class'
  )
  const [subjectId, setSubjectId] = useState(initial.subjectId ?? '')
  const [label, setLabel] = useState(initial.label ?? '')
  const [weekday, setWeekday] = useState(initial.weekday)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [room, setRoom] = useState(initial.room ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const overlapMessage = (conflict: ScheduleSlot): string =>
    t('slot.errorOverlap', {
      name: slotTitle(conflict, subjectById),
      start: conflict.start,
      end: conflict.end
    })

  const handleSave = async (): Promise<void> => {
    if (!start || !end || timeToMinutes(end) <= timeToMinutes(start)) {
      setError(t('slot.errorEndBeforeStart'))
      return
    }
    if (kind === 'class' && !subjectId) {
      setError(t('slot.errorSubject'))
      return
    }
    if (kind === 'break' && !label.trim()) {
      setError(t('slot.errorBreakName'))
      return
    }

    const draft: Draft<ScheduleSlot> = {
      id: initial.id,
      weekday,
      start,
      end,
      ...(kind === 'class'
        ? { subjectId, ...(room.trim() ? { room: room.trim() } : {}) }
        : { label: label.trim() })
    }

    // Checked here for an instant message; the main process checks it again before saving
    const localConflict = findOverlap(schedule, draft)
    if (localConflict) {
      setError(overlapMessage(localConflict))
      return
    }
    const result = await saveSlot(draft)
    if (result.status === 'overlap') {
      setError(overlapMessage(result.conflict))
      return
    }
    onClose()
  }

  const handleDelete = async (): Promise<void> => {
    if (initial.id) await deleteSlot(initial.id)
    onClose()
  }

  const title = isEditing
    ? t(kind === 'class' ? 'slot.editClass' : 'slot.editBreak')
    : t(kind === 'class' ? 'slot.newClass' : 'slot.newBreak')

  const footer = confirmingDelete ? (
    <>
      <Button onClick={() => setConfirmingDelete(false)}>{t('common.cancel')}</Button>
      <Button variant="danger" icon={Trash2} onClick={handleDelete}>
        {t('common.confirmDelete')}
      </Button>
    </>
  ) : (
    <>
      {isEditing && (
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

  const clearError = (): void => setError(null)

  return (
    <Dialog title={title} onClose={onClose} onSubmit={handleSave} footer={footer}>
      {confirmingDelete ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          {t('slot.deleteConfirm')}
        </p>
      ) : (
        <>
          <div role="radiogroup" className={`${segmentedClass} self-start`}>
            {(['class', 'break'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={kind === option}
                onClick={() => {
                  setKind(option)
                  clearError()
                }}
                className={segmentClass(kind === option)}
              >
                {t(option === 'class' ? 'slot.kindClass' : 'slot.kindBreak')}
              </button>
            ))}
          </div>

          {kind === 'class' ? (
            subjects.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                {t('slot.noSubjects')}
              </p>
            ) : (
              <Field label={t('slot.subject')}>
                <select
                  data-autofocus
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value)
                    clearError()
                  }}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t('slot.chooseSubject')}
                  </option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </Field>
            )
          ) : (
            <Field label={t('slot.breakName')}>
              <input
                data-autofocus
                value={label}
                maxLength={MAX_NAME_LENGTH}
                placeholder={t('slot.breakPlaceholder')}
                onChange={(event) => {
                  setLabel(event.target.value)
                  clearError()
                }}
                className={inputClass}
              />
            </Field>
          )}

          <Field label={t('slot.day')}>
            <select
              value={weekday}
              onChange={(event) => {
                setWeekday(Number(event.target.value))
                clearError()
              }}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  {weekdayName(day, i18n.language, 'long')}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('slot.start')}>
              <input
                type="time"
                step={300}
                value={start}
                onChange={(event) => {
                  setStart(event.target.value)
                  clearError()
                }}
                className={inputClass}
              />
            </Field>
            <Field label={t('slot.end')}>
              <input
                type="time"
                step={300}
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value)
                  clearError()
                }}
                className={inputClass}
              />
            </Field>
          </div>

          {kind === 'class' && (
            <Field label={t('slot.room')}>
              <input
                value={room}
                maxLength={MAX_ROOM_LENGTH}
                onChange={(event) => setRoom(event.target.value)}
                className={inputClass}
              />
            </Field>
          )}

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
