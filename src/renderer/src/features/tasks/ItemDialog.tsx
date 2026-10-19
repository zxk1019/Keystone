import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { timeToMinutes } from '@shared/schedule'
import { MAX_TITLE_LENGTH, MAX_TOPICS_LENGTH } from '@shared/validation'
import {
  AGENDA_ITEM_TYPES,
  PRIORITIES,
  type AgendaItem,
  type AgendaItemType,
  type Draft,
  type Priority,
  type Subject
} from '@shared/types'
import Button from '../../components/Button'
import Dialog from '../../components/Dialog'
import Field from '../../components/Field'
import { inputClass, segmentClass, segmentedClass } from '../../components/styles'
import { PRIORITY_DOTS, TYPE_ICONS } from '../../lib/itemStyles'
import { useAgendaStore } from '../../store/agendaStore'
import { useItemDialogStore } from '../../store/itemDialogStore'

const NO_SUBJECTS: Subject[] = []

/** The one dialog to create or edit homework, exams, projects and events. */
export default function ItemDialog(): JSX.Element | null {
  const draft = useItemDialogStore((state) => state.draft)
  const session = useItemDialogStore((state) => state.session)
  return draft ? <ItemForm key={session} initial={draft} /> : null
}

function ItemForm({ initial }: { initial: Draft<AgendaItem> }): JSX.Element {
  const { t } = useTranslation()
  const subjects = useAgendaStore((state) => state.agenda?.subjects ?? NO_SUBJECTS)
  const saveItem = useAgendaStore((state) => state.saveItem)
  const deleteItem = useAgendaStore((state) => state.deleteItem)
  const close = useItemDialogStore((state) => state.close)

  const isEditing = Boolean(initial.id)
  const [type, setType] = useState<AgendaItemType>(initial.type)
  const [title, setTitle] = useState(initial.title)
  const [subjectId, setSubjectId] = useState(initial.subjectId ?? '')
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time ?? '')
  const [endTime, setEndTime] = useState(initial.endTime ?? '')
  const [priority, setPriority] = useState<Priority>(initial.priority)
  const [topics, setTopics] = useState(initial.topics ?? '')
  const [done, setDone] = useState(initial.done)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isEvent = type === 'event'

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      setError(t('item.errorTitle'))
      return
    }
    if (!date) {
      setError(t('item.errorDate'))
      return
    }
    if (isEvent && time && endTime && timeToMinutes(endTime) <= timeToMinutes(time)) {
      setError(t('item.errorEndTime'))
      return
    }

    await saveItem({
      id: initial.id,
      type,
      title: title.trim(),
      date,
      // Events have no priority to choose; they keep whatever they had
      priority: isEvent ? initial.priority : priority,
      done,
      ...(subjectId ? { subjectId } : {}),
      ...(time ? { time } : {}),
      ...(isEvent && time && endTime ? { endTime } : {}),
      ...(type === 'exam' && topics.trim() ? { topics: topics.trim() } : {})
    })
    close()
  }

  const handleDelete = async (): Promise<void> => {
    if (initial.id) await deleteItem(initial.id)
    close()
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
      <Button onClick={close}>{t('common.cancel')}</Button>
      <Button variant="primary" type="submit">
        {t('common.save')}
      </Button>
    </>
  )

  const clearError = (): void => setError(null)

  return (
    <Dialog
      title={t(isEditing ? `item.edit.${type}` : `item.new.${type}`)}
      onClose={close}
      onSubmit={handleSave}
      footer={footer}
    >
      {confirmingDelete ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          {t('item.deleteConfirm', { title: initial.title })}
        </p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label={t('item.type')}
            className={`${segmentedClass} self-start`}
          >
            {AGENDA_ITEM_TYPES.map((option) => {
              const Icon = TYPE_ICONS[option]
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={type === option}
                  onClick={() => setType(option)}
                  className={segmentClass(type === option)}
                >
                  <Icon className="size-4" />
                  {t(`agenda.itemType.${option}`)}
                </button>
              )
            })}
          </div>

          <Field label={t('item.title')}>
            <input
              data-autofocus
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={t(`item.titlePlaceholder.${type}`)}
              onChange={(event) => {
                setTitle(event.target.value)
                clearError()
              }}
              className={inputClass}
            />
          </Field>

          <Field label={t('item.subject')}>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('item.noSubject')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>

          <div className={`grid gap-3 ${isEvent ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Field label={t('item.date')}>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  clearError()
                }}
                className={inputClass}
              />
            </Field>
            <Field label={t(isEvent ? 'item.startTime' : 'item.time')}>
              <input
                type="time"
                step={300}
                value={time}
                onChange={(event) => {
                  setTime(event.target.value)
                  clearError()
                }}
                className={inputClass}
              />
            </Field>
            {isEvent && (
              <Field label={t('item.endTime')}>
                <input
                  type="time"
                  step={300}
                  value={endTime}
                  disabled={!time}
                  onChange={(event) => {
                    setEndTime(event.target.value)
                    clearError()
                  }}
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          {!isEvent && (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {t('item.priority')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('item.priority')}
                className={`${segmentedClass} self-start`}
              >
                {PRIORITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={priority === option}
                    onClick={() => setPriority(option)}
                    className={segmentClass(priority === option)}
                  >
                    <span className={`size-2 rounded-full ${PRIORITY_DOTS[option]}`} />
                    {t(`priority.${option}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'exam' && (
            <Field label={t('item.topics')}>
              <textarea
                value={topics}
                rows={3}
                maxLength={MAX_TOPICS_LENGTH}
                placeholder={t('item.topicsPlaceholder')}
                onChange={(event) => setTopics(event.target.value)}
                className={`${inputClass} resize-y`}
              />
            </Field>
          )}

          {isEditing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={done}
                onChange={(event) => setDone(event.target.checked)}
                className="size-4 accent-indigo-600"
              />
              {t('item.done')}
            </label>
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
