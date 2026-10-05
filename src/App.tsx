import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components'
import { useAppStore } from './store'

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const DaysPage = lazy(() => import('./pages/DaysPage').then((module) => ({ default: module.DaysPage })))
const TrainingPage = lazy(() => import('./pages/TrainingPage').then((module) => ({ default: module.TrainingPage })))
const BrainPage = lazy(() => import('./pages/BrainPage').then((module) => ({ default: module.BrainPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

export default function App() {
  const { theme, notifications } = useAppStore((state) => state.settings)
  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.dataset.theme = resolved
  }, [theme])
  useEffect(() => {
    if (!notifications || !('Notification' in window) || Notification.permission !== 'granted') return
    const reminders: Record<string, string> = {
      '09:00': 'Утренний check-in: выбери главное на сегодня.',
      '20:00': 'Время коротко записать результаты дня.',
      '23:30': 'Мягко заверши день и начни подготовку ко сну.',
    }
    const check = () => {
      const now = new Date()
      const time = now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false })
      const key = `p90-notification-${now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })}-${time}`
      if (reminders[time] && !sessionStorage.getItem(key)) {
        new Notification('PERSONAL 90', { body: reminders[time] })
        sessionStorage.setItem(key, 'sent')
      }
    }
    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [notifications])

  return (
    <Shell>
      <Suspense fallback={<div className="page-loader">Загрузка…</div>}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/days" element={<DaysPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/brain" element={<BrainPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
