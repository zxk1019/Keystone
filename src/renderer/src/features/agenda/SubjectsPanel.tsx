import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import type { ScheduleSlot, Subject } from '@shared/types'
import Button from '../../components/Button'
import { SUBJECT_STYLES } from './subjectStyles'

interface SubjectsPanelProps {
  subjects: Subject[]
  schedule: ScheduleSlot[]
  onAdd: () => void
  onEdit: (subject: Subject) => void
}

export default function SubjectsPanel({
  subjects,
  schedule,
  onAdd,
  onEdit
}: SubjectsPanelProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-zinc-200 p-4 lg:w-56 dark:border-zinc-800">
      <h2 className="font-semibold">{t('subjects.title')}</h2>

      {subjects.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('subjects.empty')}</p>
      ) : (
        <ul className="-mx-2 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          {subjects.map((subject) => {
            const count = schedule.filter((slot) => slot.subjectId === subject.id).length
            return (
              <li key={subject.id}>
                <button
                  type="button"
                  onClick={() => onEdit(subject)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span
                    className={`size-3 shrink-0 rounded-full ${SUBJECT_STYLES[subject.color].solid}`}
                  />
                  <span className="flex-1 truncate text-sm font-medium">{subject.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {t('subjects.classCount', { count })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Button icon={Plus} onClick={onAdd}>
        {t('subjects.add')}
      </Button>
    </aside>
  )
}
