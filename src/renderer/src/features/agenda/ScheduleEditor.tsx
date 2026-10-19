import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus } from 'lucide-react'
import { minutesToTime, timeToMinutes } from '@shared/schedule'
import type { Draft, ScheduleSlot, Subject } from '@shared/types'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import { nextFreeStart, visibleHours, visibleWeekdays } from '../../lib/scheduleLayout'
import { useAgendaStore } from '../../store/agendaStore'
import { useNavigationStore } from '../../store/navigationStore'
import SlotDialog from './SlotDialog'
import SubjectDialog from './SubjectDialog'
import SubjectsPanel from './SubjectsPanel'
import WeekGrid from './WeekGrid'

/** Classes usually last about an hour, so that is what a new one starts with */
const DEFAULT_DURATION = 60

function newSlot(weekday: number, start: string): Draft<ScheduleSlot> {
  return { weekday, start, end: minutesToTime(timeToMinutes(start) + DEFAULT_DURATION) }
}

/** The Agenda in "Edit timetable" mode: a generic week plus the list of subjects. */
export default function ScheduleEditor(): JSX.Element | null {
  const { t } = useTranslation()
  const agenda = useAgendaStore((state) => state.agenda)
  const close = useNavigationStore((state) => state.closeScheduleEditor)
  const [slotDraft, setSlotDraft] = useState<Draft<ScheduleSlot> | null>(null)
  // { subject: undefined } means "create a new subject"
  const [subjectDraft, setSubjectDraft] = useState<{ subject?: Subject } | null>(null)

  if (!agenda) return null
  const { subjects, schedule } = agenda

  return (
    <div className="flex h-full flex-col gap-4 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeader title={t('agenda.editSchedule')} />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('agenda.editHint')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={Plus} onClick={() => setSlotDraft(newSlot(1, nextFreeStart(schedule, 1)))}>
            {t('agenda.addClass')}
          </Button>
          <Button variant="primary" icon={Check} onClick={close}>
            {t('agenda.done')}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <WeekGrid
            columns={visibleWeekdays(schedule).map((weekday) => ({ weekday }))}
            slots={schedule}
            subjects={subjects}
            hours={visibleHours(schedule, true)}
            onEmptyClick={(weekday, hour) =>
              setSlotDraft(newSlot(weekday, minutesToTime(hour * 60)))
            }
            onSlotClick={(slot) => setSlotDraft(slot)}
          />
        </div>
        <SubjectsPanel
          subjects={subjects}
          schedule={schedule}
          onAdd={() => setSubjectDraft({})}
          onEdit={(subject) => setSubjectDraft({ subject })}
        />
      </div>

      {slotDraft && (
        <SlotDialog
          initial={slotDraft}
          subjects={subjects}
          schedule={schedule}
          onClose={() => setSlotDraft(null)}
        />
      )}
      {subjectDraft && (
        <SubjectDialog
          subject={subjectDraft.subject}
          subjects={subjects}
          classCount={
            schedule.filter((slot) => slot.subjectId && slot.subjectId === subjectDraft.subject?.id)
              .length
          }
          onClose={() => setSubjectDraft(null)}
        />
      )}
    </div>
  )
}
