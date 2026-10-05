import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Brain, CalendarDays, ChartNoAxesCombined, Dumbbell, LayoutDashboard, Settings, Sun, Moon } from 'lucide-react'
import { useAppStore } from './store'
import { getPhase } from './program'
import { getProgramDay } from './utils'

export function Shell({ children }: { children: ReactNode }) {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const day = getProgramDay(settings.programStart)
  const phase = getPhase(day)
  const location = useLocation()
  const nav = [
    { to: '/', label: 'Сегодня', icon: LayoutDashboard },
    { to: '/days', label: '90 дней', icon: CalendarDays },
    { to: '/training', label: 'Тренировки', icon: Dumbbell },
    { to: '/brain', label: 'Brain Lab', icon: Brain },
    { to: '/progress', label: 'Прогресс', icon: ChartNoAxesCombined },
    { to: '/settings', label: 'Настройки', icon: Settings },
  ]

  const switchTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P90</span><span>PERSONAL<br /><b>OPERATING SYSTEM</b></span></div>
        <div className="cycle">
          <div className="eyebrow">ТЕКУЩИЙ ЦИКЛ</div>
          <strong>День {day} <span>/ 90</span></strong>
          <div className="progress"><i style={{ width: `${(day / 90) * 100}%` }} /></div>
          <small>PHASE {phase.id} · {phase.name}</small>
        </div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}><Icon size={18} />{label}</NavLink>
          ))}
        </nav>
        <button className="theme-toggle" onClick={switchTheme}>
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {settings.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </button>
      </aside>
      <main>
        <header className="mobile-header">
          <div className="brand"><span className="brand-mark">P90</span></div>
          <span>День {day} · {phase.name}</span>
          <button className="icon-button" onClick={switchTheme}>{settings.theme === 'dark' ? <Sun /> : <Moon />}</button>
        </header>
        <div className="page" key={location.pathname}>{children}</div>
      </main>
      <nav className="bottom-nav">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}><Icon size={20} /><span>{label.split(' ')[0]}</span></NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

export function Ring({ value, size = 116 }: { value: number; size?: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100"><circle className="ring-bg" cx="50" cy="50" r={r} /><circle className="ring-value" cx="50" cy="50" r={r} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} /></svg>
      <strong>{value}<span>/100</span></strong>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
