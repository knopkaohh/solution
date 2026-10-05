import { useRef, useState } from 'react'
import { Bell, Check, Download, Moon, Shield, Sun, Upload } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import type { AppData } from '../types'

export function SettingsPage() {
  const store = useAppStore()
  const { settings, updateSettings } = store
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const exportData = () => {
    const data: AppData = {
      version: store.version, settings: store.settings, dailyLogs: store.dailyLogs,
      sleepLogs: store.sleepLogs, nutritionLogs: store.nutritionLogs, workouts: store.workouts,
      brainSessions: store.brainSessions, weeklyReviews: store.weeklyReviews, monthlyReviews: store.monthlyReviews,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `personal-90-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Резервная копия скачана')
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as AppData
      if (!data.settings || !data.dailyLogs || data.version !== 1) throw new Error()
      store.importData(data)
      setMessage('Данные восстановлены')
    } catch {
      setMessage('Не удалось прочитать файл. Нужен JSON из PERSONAL 90.')
    }
  }
  const toggleNotifications = async () => {
    if (!settings.notifications) {
      if (!('Notification' in window)) return setMessage('Этот браузер не поддерживает уведомления')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setMessage('Разрешение на уведомления не получено')
      new Notification('PERSONAL 90', { body: 'Напоминания включены. Продолжай в своём темпе.' })
    }
    updateSettings({ notifications: !settings.notifications })
  }

  return (
    <>
      <PageTitle eyebrow="SETTINGS" title="Настрой систему под себя." description="Цели — ориентиры, а не наказание. Их можно менять в любой момент." />
      {message && <div className="toast"><Check size={17} />{message}<button onClick={() => setMessage('')}>×</button></div>}
      <div className="settings-grid">
        <Card>
          <div className="settings-title"><span>01</span><div><h2>Цикл и ритм</h2><p>Основные ориентиры программы</p></div></div>
          <div className="form-grid two">
            <Field label="Имя"><input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} /></Field>
            <Field label="Начало программы"><input type="date" value={settings.programStart} onChange={(e) => updateSettings({ programStart: e.target.value })} /></Field>
            <Field label="Желаемый сон"><input type="time" value={settings.sleepTarget} onChange={(e) => updateSettings({ sleepTarget: e.target.value })} /></Field>
            <Field label="Подъём"><input type="time" value={settings.wakeTarget} onChange={(e) => updateSettings({ wakeTarget: e.target.value })} /></Field>
            <Field label="Начальная цель шагов"><div className="inline-input"><input type="number" step="500" min="1000" value={settings.baseStepGoal} onChange={(e) => updateSettings({ baseStepGoal: Number(e.target.value) })} /><span>шагов</span></div></Field>
            <Field label="Brain session"><div className="inline-input"><input type="number" min="5" max="120" value={settings.brainMinutes} onChange={(e) => updateSettings({ brainMinutes: Number(e.target.value) })} /><span>мин</span></div></Field>
          </div>
          <Field label="Дни тренировок"><div className="day-picker">{weekdays.map((label, day) => <button key={label} className={settings.workoutDays.includes(day) ? 'active' : ''} onClick={() => updateSettings({ workoutDays: settings.workoutDays.includes(day) ? settings.workoutDays.filter((d) => d !== day) : [...settings.workoutDays, day] })}>{label}</button>)}</div></Field>
        </Card>

        <Card>
          <div className="settings-title"><span>02</span><div><h2>Интерфейс</h2><p>Вид и уровень детализации</p></div></div>
          <Field label="Тема"><div className="option-grid">
            <button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => updateSettings({ theme: 'dark' })}><Moon />Тёмная</button>
            <button className={settings.theme === 'light' ? 'active' : ''} onClick={() => updateSettings({ theme: 'light' })}><Sun />Светлая</button>
          </div></Field>
          <Field label="Дневник питания"><div className="option-grid">
            <button className={settings.nutritionMode === 'simple' ? 'active' : ''} onClick={() => updateSettings({ nutritionMode: 'simple' })}><b>SIMPLE</b><small>Приёмы пищи и оценка</small></button>
            <button className={settings.nutritionMode === 'advanced' ? 'active' : ''} onClick={() => updateSettings({ nutritionMode: 'advanced' })}><b>ADVANCED</b><small>Калории и БЖУ</small></button>
          </div></Field>
        </Card>

        <Card>
          <div className="settings-title"><span>03</span><div><h2>Напоминания</h2><p>Только с разрешения браузера</p></div></div>
          <button className={`setting-toggle ${settings.notifications ? 'active' : ''}`} onClick={toggleNotifications}><Bell /><span><b>Browser notifications</b><small>09:00 check-in · 20:00 итоги · 23:30 подготовка ко сну</small></span><i /></button>
          <p className="footnote">Веб-уведомления зависят от настроек браузера и могут не приходить, когда приложение закрыто.</p>
        </Card>

        <Card>
          <div className="settings-title"><span>04</span><div><h2>Данные</h2><p>Локально в этом браузере</p></div></div>
          <div className="privacy-note"><Shield /><span><b>Без аккаунта и облака</b><small>Записи не покидают устройство. Регулярно сохраняй резервную копию.</small></span></div>
          <div className="data-actions">
            <button className="primary" onClick={exportData}><Download /> Export JSON</button>
            <button className="secondary" onClick={() => fileRef.current?.click()}><Upload /> Import JSON</button>
            <input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={(e) => importData(e.target.files?.[0])} />
          </div>
          <button className="danger-link" onClick={() => { if (window.confirm('Удалить все локальные данные PERSONAL 90? Это действие нельзя отменить.')) store.resetData() }}>Удалить все локальные данные</button>
        </Card>
      </div>
    </>
  )
}
