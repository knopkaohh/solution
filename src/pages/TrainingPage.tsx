import { useState } from 'react'
import { Check, ChevronDown, Dumbbell, History, ShieldCheck } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import type { ExerciseResult } from '../types'
import { formatDate, todayKey, uid } from '../utils'

const templates = {
  A: ['Разминка', 'Жим ногами', 'Жим гантелей лёжа', 'Тяга верхнего блока', 'Жим гантелей сидя', 'Сгибание ног', 'Заминка'],
  B: ['Разминка', 'Гоблет-присед', 'Жим в тренажёре', 'Горизонтальная тяга', 'Разведения гантелей', 'Гиперэкстензия', 'Заминка'],
}

export function TrainingPage() {
  const { settings, workouts, saveWorkout } = useAppStore()
  const [active, setActive] = useState<'A' | 'B'>('A')
  const existing = workouts.find((item) => item.date === todayKey() && item.template === active)
  const [duration, setDuration] = useState(existing?.duration ?? 60)
  const [results, setResults] = useState<ExerciseResult[]>(existing?.exercises ?? templates[active].map((name) => ({ name, done: false, sets: [{}] })))
  const [saved, setSaved] = useState(false)

  const changeTemplate = (template: 'A' | 'B') => {
    setActive(template)
    const session = workouts.find((item) => item.date === todayKey() && item.template === template)
    setDuration(session?.duration ?? 60)
    setResults(session?.exercises ?? templates[template].map((name) => ({ name, done: false, sets: [{}] })))
    setSaved(false)
  }
  const updateExercise = (index: number, patch: Partial<ExerciseResult>) => setResults(results.map((item, i) => i === index ? { ...item, ...patch } : item))
  const updateSet = (index: number, key: 'weight' | 'reps', value: number) => {
    const sets = [...results[index].sets]
    sets[0] = { ...sets[0], [key]: value || undefined }
    updateExercise(index, { sets })
  }
  const save = () => {
    saveWorkout({ id: existing?.id ?? uid(), date: todayKey(), template: active, duration, completed: results.filter((r) => !['Разминка', 'Заминка'].includes(r.name)).some((r) => r.done), exercises: results })
    setSaved(true)
  }

  return (
    <>
      <PageTitle eyebrow="TRAINING" title="Сильнее, постепенно." description="Две full-body тренировки в неделю. Качество движения важнее цифр." />
      <div className="training-summary">
        <Card><span className="eyebrow">ПЛАН НЕДЕЛИ</span><strong>{settings.workoutDays.map((day) => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day]).join(' · ')}</strong><small>2 силовые · 60–90 минут</small></Card>
        <Card><span className="eyebrow">ВСЕГО</span><strong>{workouts.filter((w) => w.completed).length}</strong><small>тренировок за цикл</small></Card>
        <Card><span className="eyebrow">БЕЗОПАСНОСТЬ</span><strong>Без боли</strong><small>замени упражнение или остановись</small></Card>
      </div>

      <Card className="workout-card">
        <div className="section-heading">
          <div><span className="eyebrow">СЕГОДНЯ · {formatDate(todayKey()).toUpperCase()}</span><h2>Workout {active}</h2></div>
          <div className="segmented"><button className={active === 'A' ? 'active' : ''} onClick={() => changeTemplate('A')}>A</button><button className={active === 'B' ? 'active' : ''} onClick={() => changeTemplate('B')}>B</button></div>
        </div>
        <div className="workout-head"><span>Упражнение</span><span>Прошлый раз</span><span>Вес</span><span>Повторы</span><span></span></div>
        <div className="exercise-list">
          {results.map((exercise, index) => {
            const previous = [...workouts].reverse().find((workout) => workout.date < todayKey() && workout.exercises.some((item) => item.name === exercise.name))
              ?.exercises.find((item) => item.name === exercise.name)?.sets[0]
            const simple = exercise.name === 'Разминка' || exercise.name === 'Заминка'
            return (
              <div className={`exercise-row ${exercise.done ? 'done' : ''}`} key={`${exercise.name}-${index}`}>
                <button className="checkbox" onClick={() => updateExercise(index, { done: !exercise.done })}>{exercise.done && <Check size={15} />}</button>
                <div><strong>{exercise.name}</strong><button className="replace" onClick={() => {
                  const next = window.prompt('Новое упражнение', exercise.name)
                  if (next?.trim()) updateExercise(index, { name: next.trim() })
                }}>Заменить <ChevronDown size={12} /></button></div>
                <span className="previous">{previous ? `${previous.weight ?? '—'} кг × ${previous.reps ?? '—'}` : 'Первый раз'}</span>
                {simple ? <span className="muted">—</span> : <input aria-label={`Вес ${exercise.name}`} type="number" placeholder="кг" value={exercise.sets[0]?.weight ?? ''} onChange={(e) => updateSet(index, 'weight', Number(e.target.value))} />}
                {simple ? <span className="muted">—</span> : <input aria-label={`Повторы ${exercise.name}`} type="number" placeholder="раз" value={exercise.sets[0]?.reps ?? ''} onChange={(e) => updateSet(index, 'reps', Number(e.target.value))} />}
                <span className="set-count">{simple ? '' : '× 3 подхода'}</span>
              </div>
            )
          })}
        </div>
        <div className="workout-footer">
          <Field label="Продолжительность"><div className="inline-input"><input type="number" min="15" max="180" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /><span>мин</span></div></Field>
          <div className="pain-note"><ShieldCheck size={18} /><span><b>Боль — сигнал остановиться.</b> Снизь нагрузку, замени движение или заверши тренировку.</span></div>
          <button className="primary" onClick={save}>{saved ? <><Check size={18} /> Сохранено</> : <><Dumbbell size={18} /> Завершить тренировку</>}</button>
        </div>
      </Card>

      <Card>
        <div className="section-heading"><div><span className="eyebrow">ИСТОРИЯ</span><h2>Последние тренировки</h2></div><History size={20} /></div>
        {workouts.length === 0 ? <div className="empty">Здесь появятся завершённые тренировки и сравнение результатов.</div> :
          <div className="history-list">{[...workouts].reverse().slice(0, 5).map((workout) => <div key={workout.id}><span>{formatDate(workout.date)}</span><strong>Workout {workout.template}</strong><small>{workout.duration} мин · {workout.exercises.filter((e) => e.done).length} упражнений</small></div>)}</div>}
      </Card>
    </>
  )
}
