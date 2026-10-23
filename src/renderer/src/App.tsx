import { useEffect, type ComponentType, type JSX } from 'react'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import AgendaPage from './features/agenda/AgendaPage'
import SettingsPage from './features/settings/SettingsPage'
import StudyPage from './features/study/StudyPage'
import ItemDialog from './features/tasks/ItemDialog'
import TasksPage from './features/tasks/TasksPage'
import TodayPage from './features/today/TodayPage'
import { useApplySettings } from './hooks/useApplySettings'
import { useBackButton } from './hooks/useBackButton'
import { useNotificationNavigation } from './hooks/useNotificationNavigation'
import { playChime } from './lib/chime'
import { platform } from './platform'
import type { SectionId } from './sections'
import { useAgendaStore } from './store/agendaStore'
import { useEyeBreakStore } from './store/eyeBreakStore'
import { useNavigationStore } from './store/navigationStore'
import { useSettingsStore } from './store/settingsStore'
import { useSpotifyStore } from './store/spotifyStore'
import { useStudyStore } from './store/studyStore'
import { useSyncStore } from './store/syncStore'

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
  const loadStudy = useStudyStore((state) => state.load)
  const loadEyeBreak = useEyeBreakStore((state) => state.load)
  const loadSpotify = useSpotifyStore((state) => state.load)
  const loadSync = useSyncStore((state) => state.load)
  const section = useNavigationStore((state) => state.section)
  const goTo = useNavigationStore((state) => state.goTo)

  useEffect(() => {
    loadSettings()
    loadAgenda()
    loadStudy()
    loadEyeBreak()
    loadSpotify()
    loadSync()
    // Changes that do not come from this window's own updates, e.g. a backup or another device
    const stopSettings = platform.onSettingsChanged((updated) =>
      useSettingsStore.setState({ settings: updated })
    )
    const stopData = platform.onDataChanged(() => loadAgenda())
    const stopTimer = platform.onStudyState((timer) => useStudyStore.setState({ timer }))
    // The chime plays whatever screen is open, even with the window in the tray
    const stopChime = platform.onStudyPhase(playChime)
    const stopEyeBreak = platform.onEyeBreakStatus((status) =>
      useEyeBreakStore.setState({ status })
    )
    const stopSpotify = platform.onSpotifyStatus((status) => useSpotifyStore.setState({ status }))
    const stopSync = platform.onSyncStatus((status) => useSyncStore.setState({ status }))
    return () => {
      stopSettings()
      stopData()
      stopTimer()
      stopChime()
      stopEyeBreak()
      stopSpotify()
      stopSync()
    }
  }, [loadSettings, loadAgenda, loadStudy, loadEyeBreak, loadSpotify, loadSync])

  useApplySettings(settings)
  useNotificationNavigation()
  useBackButton()

  if (!settings) return null

  const Page = PAGES[section]

  return (
    // Phones: content with the navigation at the bottom. Wider screens: sidebar on the left
    <div className="safe-area flex h-dvh flex-col bg-white text-zinc-900 md:flex-row dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar current={section} onSelect={goTo} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Page />
      </main>
      <BottomNav current={section} onSelect={goTo} />
      <ItemDialog />
    </div>
  )
}
