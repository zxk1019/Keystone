import { useEffect, type ComponentType, type JSX } from 'react'
import Sidebar from './components/Sidebar'
import AgendaPage from './features/agenda/AgendaPage'
import SettingsPage from './features/settings/SettingsPage'
import StudyPage from './features/study/StudyPage'
import ItemDialog from './features/tasks/ItemDialog'
import TasksPage from './features/tasks/TasksPage'
import TodayPage from './features/today/TodayPage'
import { useApplySettings } from './hooks/useApplySettings'
import { platform } from './platform'
import type { SectionId } from './sections'
import { useAgendaStore } from './store/agendaStore'
import { useNavigationStore } from './store/navigationStore'
import { useSettingsStore } from './store/settingsStore'

const PAGES: Record<SectionId, ComponentType> = {
  today: TodayPage,
  agenda: AgendaPage,
  tasks: TasksPage,
  study: StudyPage,
  settings: SettingsPage
}

export default function App(): JSX.Element | null {
  const settings = useSettingsStore((state) => state.settings)
  const loadSettings = useSettingsStore((state) => state.load)
  const loadAgenda = useAgendaStore((state) => state.load)
  const section = useNavigationStore((state) => state.section)
  const goTo = useNavigationStore((state) => state.goTo)

  useEffect(() => {
    loadSettings()
    loadAgenda()
    // Changes that do not come from this window's own updates, e.g. importing a backup
    const stopSettings = platform.onSettingsChanged((updated) =>
      useSettingsStore.setState({ settings: updated })
    )
    const stopData = platform.onDataChanged(() => loadAgenda())
    return () => {
      stopSettings()
      stopData()
    }
  }, [loadSettings, loadAgenda])

  useApplySettings(settings)

  if (!settings) return null

  const Page = PAGES[section]

  return (
    <div className="flex h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar current={section} onSelect={goTo} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Page />
      </main>
      <ItemDialog />
    </div>
  )
}
