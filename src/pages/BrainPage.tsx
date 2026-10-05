import { useEffect, useState } from 'react'
import { Brain, Check, Pause, Play, RotateCcw } from 'lucide-react'
import { Card, PageTitle } from '../components'
import { getBrainTask } from '../program'
import { useAppStore } from '../store'
import { getProgramDay, todayKey, uid } from '../utils'

export function BrainPage() {
  const { settings, brainSessions, saveBrainSession } = useAppStore()
  const day = getProgramDay(settings.programStart)
  const task = getBrainTask(day)
  const existing = brainSessions.find((item) => item.date === todayKey())
  const [seconds, setSeconds] = useState((existing?.minutes ?? settings.brainMinutes) * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [running, seconds])

  const complete = () => {
    setRunning(false)
    saveBrainSession({ id: existing?.id ?? uid(), date: todayKey(), category: task.category, minutes: Math.max(1, Math.round((settings.brainMinutes * 60 - seconds) / 60)) || settings.brainMinutes, completed: true })
  }

  const categories = [
    ['MEMORY', 'Воспроизведение без подсказок'],
    ['FOCUS', 'Один блок без переключений'],
    ['LOGIC', 'Закономерности и вероятность'],
    ['CRITICAL THINKING', 'Источники и допущения'],
    ['SPEED', 'Точность в ограниченное время'],
  ]

  return (
    <>
      <PageTitle eyebrow="BRAIN LAB" title="Тренируй качество мысли." description="Короткая осмысленная практика каждый день. Без бессмысленных игровых очков." />
      <div className="brain-layout">
        <Card className="brain-task-card">
          <span className="eyebrow">ЗАДАНИЕ ДНЯ · {task.category}</span>
          <div className="brain-orb"><Brain size={42} /></div>
          <h2>{task.title}</h2><p>{task.detail}</p>
          <div className="timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}<span>:</span>{String(seconds % 60).padStart(2, '0')}</div>
          <div className="timer-actions">
            <button className="secondary icon-button" onClick={() => { setRunning(false); setSeconds(settings.brainMinutes * 60) }}><RotateCcw /></button>
            <button className="primary" disabled={existing?.completed} onClick={() => setRunning(!running)}>{running ? <><Pause /> Пауза</> : <><Play /> {seconds === settings.brainMinutes * 60 ? 'Начать' : 'Продолжить'}</>}</button>
            <button className="secondary icon-button" aria-label="Завершить" onClick={complete}><Check /></button>
          </div>
          {existing?.completed && <div className="completion-banner"><Check size={17} /> Сегодня выполнено · {existing.minutes} мин</div>}
        </Card>
        <div className="brain-side">
          <Card>
            <span className="eyebrow">НЕДЕЛЯ</span>
            <div className="week-dots">{Array.from({ length: 7 }, (_, index) => <span key={index} className={index < brainSessions.filter((s) => s.completed).slice(-7).length ? 'done' : ''}>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}</span>)}</div>
            <div className="big-stat"><strong>{brainSessions.filter((s) => s.completed).length}</strong><span>сессий<br />за цикл</span></div>
          </Card>
          <Card>
            <span className="eyebrow">НАВЫКИ В ЦИКЛЕ</span>
            <div className="category-list">{categories.map(([name, detail], index) => <div key={name}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{name}</strong><small>{detail}</small></span></div>)}</div>
          </Card>
        </div>
      </div>
    </>
  )
}
