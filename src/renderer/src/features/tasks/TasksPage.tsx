import { useMemo, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { AGENDA_ITEM_TYPES, type AgendaItemType } from '@shared/types'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import { inputClass, segmentClass, segmentedClass } from '../../components/styles'
import { useNow } from '../../hooks/useNow'
import { buildSections, type StatusFilter } from '../../lib/taskSections'
import { useAgendaStore } from '../../store/agendaStore'
import { useItemDialogStore } from '../../store/itemDialogStore'
import { useNavigationStore } from '../../store/navigationStore'
import TaskRow from './TaskRow'

const STATUSES: StatusFilter[] = ['pending', 'overdue', 'done', 'all']
/** 'all', 'none' (no subject) or a subject id */
type SubjectFilter = string

export default function TasksPage(): JSX.Element | null {
  const { t } = useTranslation()
  const agenda = useAgendaStore((state) => state.agenda)
  const openNew = useItemDialogStore((state) => state.openNew)
  const now = useNow()
  const status = useNavigationStore((state) => state.tasksStatus)
  const setStatus = useNavigationStore((state) => state.setTasksStatus)
  const [type, setType] = useState<AgendaItemType | 'all'>('all')
  const [subject, setSubject] = useState<SubjectFilter>('all')

  const subjectById = useMemo(
    () => new Map((agenda?.subjects ?? []).map((s) => [s.id, s])),
    [agenda]
  )

  if (!agenda) return null

  const filtered = agenda.items.filter(
    (item) =>
      (type === 'all' || item.type === type) &&
      (subject === 'all' || (subject === 'none' ? !item.subjectId : item.subjectId === subject))
  )
  const sections = buildSections(filtered, status, now)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={t('nav.tasks')} />
        <Button variant="primary" icon={Plus} onClick={() => openNew()}>
          {t('tasks.new')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label={t('tasks.status.label')} className={segmentedClass}>
          {STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={status === option}
              onClick={() => setStatus(option)}
              className={segmentClass(status === option)}
            >
              {t(`tasks.status.${option}`)}
            </button>
          ))}
        </div>
        <select
          aria-label={t('item.type')}
          value={type}
          onChange={(event) => setType(event.target.value as AgendaItemType | 'all')}
          className={inputClass}
        >
          <option value="all">{t('tasks.allTypes')}</option>
          {AGENDA_ITEM_TYPES.map((option) => (
            <option key={option} value={option}>
              {t(`agenda.itemType.${option}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('item.subject')}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className={inputClass}
        >
          <option value="all">{t('tasks.allSubjects')}</option>
          {agenda.subjects.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
          <option value="none">{t('tasks.noSubject')}</option>
        </select>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {t('tasks.empty')}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-1">
            <h2
              className={`px-2 text-xs font-semibold tracking-wide uppercase ${
                section.key === 'overdue'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {t(`tasks.group.${section.key}`)}
              <span className="ml-2 font-normal">{section.items.length}</span>
            </h2>
            {section.items.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                subject={item.subjectId ? subjectById.get(item.subjectId) : undefined}
                today={now}
                showDate={section.key !== 'today' && section.key !== 'tomorrow'}
              />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
