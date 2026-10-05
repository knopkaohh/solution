/* eslint-disable react-hooks/exhaustive-deps -- date changes intentionally hydrate an isolated local draft */
import { useEffect, useState } from 'react'
import { Brain, Check, Pause, Play, RotateCcw } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { getBrainTask } from '../program'
import { useAppStore } from '../store'
import type { BrainSession } from '../types'
import { formatDate, todayKey, uid } from '../utils'

export function BrainPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const plan = store.dailyPlans[date]
  const task = getBrainTask(plan?.programDay ?? 1)
  const existing = store.brainSessions.find((session) => session.date === date)
  const plannedDuration = plan?.mode === 'minimum' ? plan.targetsSnapshot.brainMinutesMinimum : plan?.targetsSnapshot.brainMinutesFull ?? store.settings.brainMinutes
  const [elapsedSeconds, setElapsedSeconds] = useState((existing?.actualDuration ?? 0) * 60)
  const [running, setRunning] = useState(false)
  const [runStartedAt, setRunStartedAt] = useState<number | undefined>()
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 1)
  const [correct, setCorrect] = useState<number | undefined>(existing?.correct)
  const [total, setTotal] = useState<number | undefined>(existing?.total)
  const [interruptions, setInterruptions] = useState<number | undefined>(existing?.interruptions)
  const [fatigue, setFatigue] = useState<number | undefined>(existing?.fatigue)
  const [result, setResult] = useState(existing?.result ?? '')
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  useEffect(() => {
    const session = store.brainSessions.find((item) => item.date === date)
    // Date changes intentionally hydrate this local session draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsedSeconds((session?.actualDuration ?? 0) * 60)
    setDifficulty(session?.difficulty ?? 1)
    setCorrect(session?.correct)
    setTotal(session?.total)
    setInterruptions(session?.interruptions)
    setFatigue(session?.fatigue)
    setResult(session?.result ?? '')
    setRunning(false)
    setRunStartedAt(undefined)
  }, [date])

  useEffect(() => {
    if (!running || runStartedAt === undefined) return
    const timer = window.setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [running, runStartedAt])

  const sessionData = (completed: boolean, seconds = elapsedSeconds): BrainSession => ({
    id: existing?.id ?? uid(), date, category: task.category, task: task.title,
    difficulty, plannedDuration, actualDuration: Math.max(0, Math.round(seconds / 60)),
    accuracy: total && correct !== undefined ? Math.round(correct / total * 100) : undefined,
    correct, total, interruptions, fatigue, result, completed,
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
        eyebrow="BRAIN LAB"
        title={`${task.category} · ${plannedDuration} минут`}
        description={`${task.title}. Результаты категорий хранятся отдельно — единой оценки интеллекта нет.`}
        action={<input className="date-input" aria-label="Дата Brain-сессии" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value)} />}
      />
      <div className="brain-layout">
        <Card className="brain-task-card">
          <span className="eyebrow">{formatDate(date).toUpperCase()} · DIFFICULTY {difficulty}</span>
          <div className="brain-orb"><Brain size={42} /></div>
          <h2>{task.title}</h2><p>{task.detail}</p>
          <div className="timer count-up">{String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}<span>:</span>{String(elapsedSeconds % 60).padStart(2, '0')}<small> / {plannedDuration}:00</small></div>
          <div className="timer-actions">
            <button className="secondary icon-button" aria-label="Сбросить таймер" onClick={() => { setRunning(false); setElapsedSeconds(0) }}><RotateCcw /></button>
            <button className="primary" disabled={existing?.completed} onClick={running ? pause : start}>{running ? <><Pause /> Пауза</> : <><Play /> {elapsedSeconds ? 'Продолжить' : 'Начать'}</>}</button>
            <button className="secondary icon-button" aria-label="Завершить сессию" disabled={!existing && elapsedSeconds === 0} onClick={complete}><Check /></button>
          </div>
          {existing?.completed && <div className="completion-banner"><Check size={17} /> Завершено · {existing.actualDuration} мин</div>}
        </Card>

        <div className="brain-side">
          <Card>
            <span className="eyebrow">РЕЗУЛЬТАТ СЕССИИ</span>
            <div className="form-grid two compact">
              <Field label="Difficulty"><input type="number" min="1" max="10" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} /></Field>
              <Field label="Interruptions"><input type="number" min="0" value={interruptions ?? ''} onChange={(event) => setInterruptions(Number(event.target.value) || undefined)} /></Field>
              <Field label="Правильно"><input type="number" min="0" value={correct ?? ''} onChange={(event) => setCorrect(Number(event.target.value) || undefined)} /></Field>
              <Field label="Всего"><input type="number" min="0" value={total ?? ''} onChange={(event) => setTotal(Number(event.target.value) || undefined)} /></Field>
              <Field label="Fatigue 1–5"><input type="number" min="1" max="5" value={fatigue ?? ''} onChange={(event) => setFatigue(Number(event.target.value) || undefined)} /></Field>
              <Field label="Краткий результат"><input value={result} onChange={(event) => setResult(event.target.value)} /></Field>
            </div>
            <button className="secondary full-width" onClick={() => store.saveBrainSession(sessionData(existing?.completed ?? false))}>Сохранить данные</button>
          </Card>
          <Card>
            <span className="eyebrow">ИСТОРИЯ</span>
            <div className="category-list">{[...store.brainSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((session) => <div key={session.id}><i>{session.date.slice(5)}</i><span><strong>{session.category}</strong><small>{session.actualDuration} мин · accuracy {session.accuracy ?? '—'}% · difficulty {session.difficulty}</small></span></div>)}</div>
          </Card>
        </div>
      </div>
    </>
  )
}
