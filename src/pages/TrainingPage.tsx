/* eslint-disable react-hooks/exhaustive-deps -- date/template changes intentionally hydrate an isolated local draft */
import { useEffect, useMemo, useState } from 'react'
import { Check, Dumbbell, History, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { getNextWorkoutTemplate } from '../program'
import { useAppStore } from '../store'
import type { ExerciseSet, WorkoutTemplate } from '../types'
import { formatDate, todayKey, uid } from '../utils'

const templates: Record<WorkoutTemplate, string[]> = {
  A: ['Жим ногами', 'Жим в тренажёре', 'Горизонтальная тяга', 'Сгибание ног', 'Тяга верхнего блока', 'Pallof Press'],
  B: ['Гоблет-присед', 'Наклонный жим', 'Тяга с упором грудью', 'Ягодичный мост', 'Тяга верхнего блока', 'Dead Bug'],
}

function createSets(template: WorkoutTemplate): ExerciseSet[] {
  return templates[template].flatMap((name) => Array.from({ length: 2 }, (_, index) => ({
    id: uid(), exerciseId: name.toLowerCase().replace(/\s+/g, '-'), exerciseName: name,
    setNumber: index + 1, completed: false, kind: 'work' as const,
  })))
}

export function TrainingPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const plan = store.dailyPlans[date]
  const plannedTemplate = plan?.targetsSnapshot.workoutTemplate
  const suggestedTemplate = plannedTemplate ?? getNextWorkoutTemplate(store.workouts.filter((item) => item.date <= date))
  const [template, setTemplate] = useState<WorkoutTemplate>(suggestedTemplate)
  const existing = store.workouts.find((item) => item.date === date && item.template === template)
  const [sets, setSets] = useState<ExerciseSet[]>(existing?.sets ?? createSets(template))
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 60)
  const [sessionRpe, setSessionRpe] = useState<number | undefined>(existing?.sessionRpe)
  const [shortened, setShortened] = useState(existing?.shortened ?? plan?.mode === 'minimum')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saved, setSaved] = useState(false)
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  useEffect(() => {
    const nextTemplate = store.dailyPlans[date]?.targetsSnapshot.workoutTemplate ?? getNextWorkoutTemplate(store.workouts.filter((item) => item.date <= date))
    // Date changes intentionally select the immutable plan's workout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplate(nextTemplate)
  }, [date])

  useEffect(() => {
    const session = store.workouts.find((item) => item.date === date && item.template === template)
    // Date/template changes intentionally hydrate this local workout draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSets(session?.sets ?? createSets(template))
    setDuration(session?.durationMinutes ?? 60)
    setSessionRpe(session?.sessionRpe)
    setShortened(session?.shortened ?? store.dailyPlans[date]?.mode === 'minimum')
    setNotes(session?.notes ?? '')
    setSaved(false)
  }, [date, template])

  const exerciseGroups = useMemo(() => templates[template].map((name) => ({ name, sets: sets.filter((set) => set.exerciseName === name) })), [sets, template])

  const updateSet = (id: string, patch: Partial<ExerciseSet>) => setSets((current) => current.map((set) => set.id === id ? { ...set, ...patch } : set))
  const addSet = (exerciseName: string) => {
    const sameExercise = sets.filter((set) => set.exerciseName === exerciseName)
    setSets([...sets, {
      id: uid(), exerciseId: sameExercise[0].exerciseId, exerciseName,
      setNumber: sameExercise.length + 1, completed: false, kind: 'work',
    }])
  }
  const removeSet = (id: string) => setSets(sets.filter((set) => set.id !== id))
  const save = () => {
    const completedSets = sets.filter((set) => set.completed).length
    const workSets = sets.filter((set) => set.kind === 'work').length
    const completed = shortened ? completedSets >= 2 : completedSets >= Math.ceil(workSets * 0.5)
    const endedAt = new Date()
    store.saveWorkout({
      id: existing?.id ?? uid(), date, template, durationMinutes: Math.max(0, duration),
      sessionRpe, completed, shortened,
      recoveryMode: plan?.mode === 'recovery', notes, sets,
      startedAt: existing?.startedAt ?? new Date(endedAt.getTime() - Math.max(0, duration) * 60_000).toISOString(),
      endedAt: endedAt.toISOString(),
    })
    setSaved(true)
  }

  return (
    <>
      <PageTitle
        eyebrow="TRAINING"
        title={`Workout ${template}`}
        description={plannedTemplate ? `Запланировано на ${formatDate(date)}. Следующий шаблон определяется последней завершённой тренировкой.` : 'На этот день силовая не запланирована. Результат всё равно можно сохранить.'}
        action={<input className="date-input" aria-label="Дата тренировки" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value)} />}
      />
      <div className="training-summary">
        <Card><span className="eyebrow">ПЛАН</span><strong>{plannedTemplate ? `Workout ${plannedTemplate}` : 'Без силовой'}</strong><small>snapshot дня не меняется</small></Card>
        <Card><span className="eyebrow">СЛЕДУЮЩАЯ</span><strong>Workout {getNextWorkoutTemplate(store.workouts)}</strong><small>по последней завершённой</small></Card>
        <Card><span className="eyebrow">ВСЕГО</span><strong>{store.workouts.filter((workout) => workout.completed).length}</strong><small>завершённых тренировок</small></Card>
      </div>

      <Card className="workout-card">
        <div className="section-heading">
          <div><span className="eyebrow">{formatDate(date).toUpperCase()}</span><h2>Рабочие подходы</h2></div>
          <div className="segmented"><button className={template === 'A' ? 'active' : ''} onClick={() => setTemplate('A')}>A</button><button className={template === 'B' ? 'active' : ''} onClick={() => setTemplate('B')}>B</button></div>
        </div>
        <div className="set-table set-head"><span>Упражнение / подход</span><span>Вес</span><span>Повторы</span><span>RPE</span><span></span></div>
        <div className="exercise-groups">
          {exerciseGroups.map((group) => {
            const previousSet = [...store.workouts].filter((workout) => workout.date < date).sort((a, b) => b.date.localeCompare(a.date)).flatMap((workout) => workout.sets).find((set) => set.exerciseName === group.name && set.completed)
            return <div className="exercise-group" key={group.name}>
              <div className="exercise-name"><div><strong>{group.name}</strong><small>{previousSet ? `Прошлый результат: ${previousSet.weight ?? '—'} кг × ${previousSet.reps ?? '—'} · RPE ${previousSet.rpe ?? '—'}` : 'Первый результат'}</small></div><button className="text-button" onClick={() => addSet(group.name)}><Plus size={13} /> Подход</button></div>
              {group.sets.map((set) => <div className={`set-table set-row ${set.completed ? 'done' : ''}`} key={set.id}>
                <button className="checkbox" onClick={() => updateSet(set.id, { completed: !set.completed })}>{set.completed && <Check size={14} />}</button>
                <span>Подход {set.setNumber}</span>
                <input aria-label={`${group.name} подход ${set.setNumber} вес`} type="number" step=".5" value={set.weight ?? ''} placeholder="кг" onChange={(event) => updateSet(set.id, { weight: Number(event.target.value) || undefined })} />
                <input aria-label={`${group.name} подход ${set.setNumber} повторения`} type="number" value={set.reps ?? ''} placeholder="раз" onChange={(event) => updateSet(set.id, { reps: Number(event.target.value) || undefined })} />
                <input aria-label={`${group.name} подход ${set.setNumber} RPE`} type="number" min="1" max="10" value={set.rpe ?? ''} placeholder="1–10" onChange={(event) => updateSet(set.id, { rpe: Number(event.target.value) || undefined })} />
                <button className="icon-button" aria-label={`Удалить подход ${set.setNumber}`} onClick={() => removeSet(set.id)}><Trash2 size={14} /></button>
              </div>)}
            </div>
          })}
        </div>
        <div className="workout-meta">
          <Field label="Продолжительность"><div className="inline-input"><input type="number" min="0" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /><span>мин</span></div></Field>
          <Field label="Session RPE"><input type="number" min="1" max="10" value={sessionRpe ?? ''} onChange={(event) => setSessionRpe(Number(event.target.value) || undefined)} /></Field>
          <Field label="Формат"><div className="boolean-choice"><button className={!shortened ? 'active' : ''} onClick={() => setShortened(false)}>Обычная</button><button className={shortened ? 'active' : ''} onClick={() => setShortened(true)}>Сокращённая</button></div></Field>
          <Field label="Заметка"><input value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        </div>
        <div className="workout-footer">
          <div className="pain-note"><ShieldCheck size={18} /><span><b>Не тренируйся через боль.</b> Замени движение или заверши сессию.</span></div>
          <button className="primary" onClick={save}>{saved ? <><Check size={17} /> Сохранено</> : <><Dumbbell size={17} /> Сохранить тренировку</>}</button>
        </div>
      </Card>

      <Card>
        <div className="section-heading"><div><span className="eyebrow">ИСТОРИЯ</span><h2>Последние тренировки</h2></div><History /></div>
        {store.workouts.length === 0 ? <div className="empty">После первой тренировки здесь появится история подходов.</div> :
          <div className="history-list">{[...store.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((workout) => <div key={workout.id}><span>{formatDate(workout.date)}</span><strong>Workout {workout.template}</strong><small>{workout.durationMinutes} мин · {workout.sets.filter((set) => set.completed).length} подходов · RPE {workout.sessionRpe ?? '—'}</small></div>)}</div>}
      </Card>
    </>
  )
}
