import { useEffect, useState } from 'react'
import { Check, Dumbbell, History, ShieldCheck } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import { formatDate, todayKey, uid } from '../utils'

export function TrainingPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const existing = store.workouts.find((item) => item.date === date)
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 0)
  const [load, setLoad] = useState<number | undefined>(existing?.sessionRpe)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saved, setSaved] = useState(false)
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  const changeDate = (value: string) => {
    const session = store.workouts.find((item) => item.date === value)
    setDate(value)
    setDuration(session?.durationMinutes ?? 0)
    setLoad(session?.sessionRpe)
    setNotes(session?.notes ?? '')
    setSaved(false)
  }
  const save = () => {
    const endedAt = new Date()
    store.saveWorkout({
      id: existing?.id ?? uid(), date, template: 'CUSTOM',
      durationMinutes: Math.max(0, duration), sessionRpe: load,
      completed: duration > 0 || notes.trim().length > 0,
      shortened: store.dailyPlans[date]?.mode === 'minimum',
      recoveryMode: store.dailyPlans[date]?.mode === 'recovery',
      notes: notes.trim(), sets: existing?.sets ?? [],
      startedAt: existing?.startedAt ?? new Date(endedAt.getTime() - Math.max(0, duration) * 60_000).toISOString(),
      endedAt: endedAt.toISOString(),
    })
    setSaved(true)
  }

  return (
    <>
      <PageTitle
        eyebrow="ТРЕНИРОВКА"
        title="Запиши, что ты сделал."
        description="Приложение не задаёт программу. Просто сохрани факт тренировки, продолжительность и свои заметки."
        action={<input className="date-input" aria-label="Дата тренировки" type="date" value={date} max={todayKey()} onChange={(event) => changeDate(event.target.value)} />}
      />

      <div className="simple-training-layout">
        <Card className="simple-training-form">
          <div className="section-heading"><div><span className="eyebrow">{formatDate(date).toUpperCase()}</span><h2>Данные тренировки</h2></div><Dumbbell /></div>
          <div className="form-grid two">
            <Field label="Продолжительность"><div className="inline-input"><input type="number" min="0" value={duration || ''} placeholder="0" onChange={(event) => { setDuration(Math.max(0, Number(event.target.value))); setSaved(false) }} /><span>мин</span></div></Field>
            <Field label="Нагрузка по ощущениям · 1–10"><input type="number" min="1" max="10" value={load ?? ''} onChange={(event) => { setLoad(Number(event.target.value) || undefined); setSaved(false) }} /></Field>
          </div>
          <Field label="Что делал на тренировке"><textarea rows={8} placeholder="Например: ноги, грудь, спина; какие упражнения делал и какие веса использовал…" value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false) }} /></Field>
          <div className="workout-footer">
            <div className="pain-note"><ShieldCheck size={18} /><span><b>Не тренируйся через боль.</b> Записывай только то, что реально сделал.</span></div>
            <button className="primary" onClick={save}>{saved ? <><Check size={17} /> Сохранено</> : <><Dumbbell size={17} /> Сохранить тренировку</>}</button>
          </div>
        </Card>

        <Card>
          <div className="section-heading"><div><span className="eyebrow">ИСТОРИЯ</span><h2>Последние тренировки</h2></div><History /></div>
          {store.workouts.length === 0 ? <div className="empty">Здесь появятся твои записи о тренировках.</div> :
            <div className="training-history">{[...store.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((workout) => <button key={workout.id} onClick={() => changeDate(workout.date)}><span>{formatDate(workout.date)}</span><strong>{workout.durationMinutes} мин</strong><small>{workout.notes || 'Без комментария'} · нагрузка {workout.sessionRpe ?? '—'}/10</small></button>)}</div>}
        </Card>
      </div>
    </>
  )
}
