import { useEffect, useState, type ComponentType, type JSX } from 'react'
import Sidebar from './components/Sidebar'
import AgendaPage from './features/agenda/AgendaPage'
import SettingsPage from './features/settings/SettingsPage'
import StudyPage from './features/study/StudyPage'
import TasksPage from './features/tasks/TasksPage'
import TodayPage from './features/today/TodayPage'
import { useApplySettings } from './hooks/useApplySettings'
import { platform } from './platform'
import type { SectionId } from './sections'
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
  const load = useSettingsStore((state) => state.load)
  const [section, setSection] = useState<SectionId>('today')

  useEffect(() => {
    load()
    // Changes that do not come from this window's own updates, e.g. importing a backup
    return platform.onSettingsChanged((updated) => useSettingsStore.setState({ settings: updated }))
  }, [load])

  useApplySettings(settings)

  if (!settings) return null

  const Page = PAGES[section]

  return (
    <div className="flex h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar current={section} onSelect={setSection} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Page />
      </main>
    </div>
  )
}
