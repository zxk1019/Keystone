import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Trash2 } from 'lucide-react'
import { MAX_NAME_LENGTH } from '@shared/validation'
import { SUBJECT_COLORS, type Subject, type SubjectColor } from '@shared/types'
import Button from '../../components/Button'
import Dialog from '../../components/Dialog'
import Field from '../../components/Field'
import { inputClass } from '../../components/styles'
import { useAgendaStore } from '../../store/agendaStore'
import { SUBJECT_STYLES } from './subjectStyles'

interface SubjectDialogProps {
  /** Missing when creating a new subject */
  subject?: Subject
  /** All subjects, to suggest a color nobody uses yet */
  subjects: Subject[]
  /** Classes of this subject in the timetable, deleted together with it */
  classCount: number
  onClose: () => void
}

function suggestColor(subjects: Subject[]): SubjectColor {
  const used = new Set(subjects.map((subject) => subject.color))
  return (
    SUBJECT_COLORS.find((color) => !used.has(color)) ??
    SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
  )
}

export default function SubjectDialog({
  subject,
  subjects,
  classCount,
  onClose
}: SubjectDialogProps): JSX.Element {
  const { t } = useTranslation()
  const saveSubject = useAgendaStore((state) => state.saveSubject)
  const deleteSubject = useAgendaStore((state) => state.deleteSubject)
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState<SubjectColor>(subject?.color ?? suggestColor(subjects))
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      setError(t('subjects.nameRequired'))
      return
    }
    await saveSubject({ id: subject?.id, name: name.trim(), color })
    onClose()
  }

  const handleDelete = async (): Promise<void> => {
    if (subject) await deleteSubject(subject.id)
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
      {subject && (
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
      title={subject ? t('subjects.edit') : t('subjects.add')}
      onClose={onClose}
      onSubmit={handleSave}
      footer={footer}
    >
      {confirmingDelete ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          {t('subjects.deleteConfirm', { name: subject?.name, count: classCount })}
        </p>
      ) : (
        <>
          <Field label={t('subjects.name')}>
            <input
              data-autofocus
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('subjects.namePlaceholder')}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {t('subjects.color')}
            </span>
            <div
              role="radiogroup"
              aria-label={t('subjects.color')}
              className="flex flex-wrap gap-2"
            >
              {SUBJECT_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === color}
                  aria-label={t(`colors.${option}`)}
                  title={t(`colors.${option}`)}
                  onClick={() => setColor(option)}
                  className={`flex size-8 items-center justify-center rounded-full ${SUBJECT_STYLES[option].solid} ${
                    option === color
                      ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900'
                      : ''
                  }`}
                >
                  {option === color && <Check className="size-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* How the classes of this subject will look in the timetable */}
          <div
            className={`rounded-md border-l-4 px-2 py-1.5 text-xs font-semibold ${SUBJECT_STYLES[color].block}`}
          >
            {name.trim() || t('subjects.namePlaceholder')}
          </div>

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
