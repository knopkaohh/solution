import { useEffect, useState } from 'react'
import { Brain, Check, Pause, Play, RotateCcw } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import type { BrainSession } from '../types'
import { formatDate, todayKey, uid } from '../utils'

export function BrainPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const plan = store.dailyPlans[date]
  const existing = store.brainSessions.find((session) => session.date === date)
  const plannedDuration = plan?.mode === 'minimum' ? plan.targetsSnapshot.brainMinutesMinimum : plan?.targetsSnapshot.brainMinutesFull ?? 20
  const [elapsedSeconds, setElapsedSeconds] = useState((existing?.actualDuration ?? 0) * 60)
  const [running, setRunning] = useState(false)
  const [runStartedAt, setRunStartedAt] = useState<number | undefined>()
  const [comment, setComment] = useState(existing?.result ?? existing?.task ?? '')
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  useEffect(() => {
    if (!running || runStartedAt === undefined) return
    const timer = window.setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [running, runStartedAt])

  const changeDate = (value: string) => {
    const session = store.brainSessions.find((item) => item.date === value)
    setDate(value)
    setElapsedSeconds((session?.actualDuration ?? 0) * 60)
    setComment(session?.result ?? session?.task ?? '')
    setRunning(false)
    setRunStartedAt(undefined)
  }
  const sessionData = (completed: boolean, seconds = elapsedSeconds): BrainSession => ({
    id: existing?.id ?? uid(), date, category: 'FOCUS',
    task: comment.trim() || 'Самостоятельное занятие',
    difficulty: 1, plannedDuration,
    actualDuration: Math.max(0, Math.round(seconds / 60)),
    result: comment.trim(), completed,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    completedAt: completed ? new Date().toISOString() : undefined,
  })
  const start = () => {
    if (!existing) store.saveBrainSession(sessionData(false))
    setRunStartedAt(Date.now() - elapsedSeconds * 1000)
    setRunning(true)
  }
  const pause = () => {
    const seconds = runStartedAt === undefined ? elapsedSeconds : Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000))
    setRunning(false)
    setElapsedSeconds(seconds)
    setRunStartedAt(undefined)
    store.saveBrainSession(sessionData(false, seconds))
  }
  const complete = () => {
    if (!existing && elapsedSeconds === 0) return
    const seconds = runStartedAt === undefined ? elapsedSeconds : Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000))
    setRunning(false)
    setElapsedSeconds(seconds)
    setRunStartedAt(undefined)
    store.saveBrainSession(sessionData(true, seconds))
  }

  return (
    <>
      <PageTitle
        eyebrow="РАЗВИТИЕ МЫШЛЕНИЯ"
        title={`${plannedDuration} минут для себя.`}
        description="Сам выбери занятие: математика, стихи, чтение, память или сосредоточенная работа. Таймер зафиксирует время."
        action={<input className="date-input" aria-label="Дата занятия" type="date" value={date} max={todayKey()} onChange={(event) => changeDate(event.target.value)} />}
      />
      <div className="brain-layout simple-brain-layout">
        <Card className="brain-task-card">
          <span className="eyebrow">{formatDate(date).toUpperCase()}</span>
          <div className="brain-orb"><Brain size={42} /></div>
          <h2>Таймер занятия</h2>
          <div className="timer count-up">{String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}<span>:</span>{String(elapsedSeconds % 60).padStart(2, '0')}<small> / {plannedDuration}:00</small></div>
          <div className="timer-actions">
            <button className="secondary icon-button" aria-label="Сбросить таймер" onClick={() => { setRunning(false); setElapsedSeconds(0); setRunStartedAt(undefined) }}><RotateCcw /></button>
            <button className="primary" disabled={existing?.completed} onClick={running ? pause : start}>{running ? <><Pause /> Пауза</> : <><Play /> {elapsedSeconds ? 'Продолжить' : 'Начать'}</>}</button>
            <button className="secondary icon-button" aria-label="Завершить занятие" disabled={!existing && elapsedSeconds === 0} onClick={complete}><Check /></button>
          </div>
          {existing?.completed && <div className="completion-banner"><Check size={17} /> Завершено · {existing.actualDuration} мин</div>}
        </Card>

        <div className="brain-side">
          <Card className="brain-comment-card">
            <span className="eyebrow">КОММЕНТАРИЙ</span><h2>Чем ты занимался?</h2>
            <Field label="Короткая запись"><textarea rows={8} placeholder="Например: решал задачи по математике, учил стихотворение, читал сложную главу…" value={comment} onChange={(event) => setComment(event.target.value)} /></Field>
            <button className="secondary full-width" onClick={() => store.saveBrainSession(sessionData(existing?.completed ?? false))}>Сохранить комментарий</button>
          </Card>
          <Card>
            <span className="eyebrow">ИСТОРИЯ</span>
            <div className="category-list">{[...store.brainSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((session) => <div key={session.id}><i>{session.date.slice(5)}</i><span><strong>{session.actualDuration} минут</strong><small>{session.result || session.task || 'Без комментария'}</small></span></div>)}</div>
          </Card>
        </div>
      </div>
    </>
  )
}
