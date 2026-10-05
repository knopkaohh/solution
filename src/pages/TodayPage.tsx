import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Brain, Check, ChevronLeft, ChevronRight, Dumbbell, MoonStar, ShieldCheck } from 'lucide-react'
import { Card, Field, PageTitle, Ring } from '../components'
import { calculateScores } from '../scoring'
import { useAppStore } from '../store'
import type { ActionStatus, DayCondition, NutritionItem } from '../types'
import { formatDate, getProgramPosition, minutesBetween, todayKey, uid } from '../utils'

const statusLabels: Record<ActionStatus, string> = {
  FULL: 'FULL', MINIMUM: 'MINIMUM', PARTIAL: 'PARTIAL', MISSED: 'MISSED',
  NOT_APPLICABLE: 'N/A', UNVERIFIED: 'UNVERIFIED', RECOVERY_ACTION_FULL: 'RECOVERY',
}

export function TodayPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const [flow, setFlow] = useState<'morning' | 'evening'>('morning')
  const [weight, setWeight] = useState('')
  const [modeReason, setModeReason] = useState('Высокая нагрузка')
  const [food, setFood] = useState({ name: '', calories: '', protein: '', fat: '', carbs: '' })
  const position = getProgramPosition(store.cycle.startDate, date)
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  const plan = store.dailyPlans[date]
  const daily = store.dailyLogs[date]
  const sleep = store.sleepLogs[date]
  const nutrition = store.nutritionLogs[date]
  const scores = useMemo(() => plan ? calculateScores(store, plan) : undefined, [store, plan])
  const latestWeight = [...store.weightMeasurements].filter((item) => item.timestamp.startsWith(date)).at(-1)

  const changeDate = (amount: number) => setDate(format(addDays(parseISO(date), amount), 'yyyy-MM-dd'))
  const updateSleepTime = (key: 'sleepOnset' | 'wakeTime', value: string) => {
    const next = { ...sleep, [key]: value }
    store.updateSleep(date, { [key]: value, durationMinutes: minutesBetween(next.sleepOnset, next.wakeTime) })
  }
  const activateMode = (mode: 'normal' | 'minimum' | 'recovery') => {
    store.setDayMode(date, mode, mode === 'normal' ? 'Возврат к исходному плану' : modeReason)
  }
  const addWeight = () => {
    const value = Number(weight)
    if (value > 0) {
      store.addWeight(date, value)
      setWeight('')
    }
  }
  const addFood = () => {
    if (!food.name.trim()) return
    const item: NutritionItem = {
      id: uid(), meal: 'Обед', name: food.name.trim(),
      calories: Number(food.calories) || undefined, protein: Number(food.protein) || undefined,
      fat: Number(food.fat) || undefined, carbs: Number(food.carbs) || undefined,
    }
    store.updateNutrition(date, { items: [...(nutrition?.items ?? []), item] })
    setFood({ name: '', calories: '', protein: '', fat: '', carbs: '' })
  }

  if (position.status !== 'ACTIVE') {
    return (
      <>
        <PageTitle eyebrow="PERSONAL 90" title={position.status === 'BEFORE' ? 'Цикл ещё не начался.' : 'Цикл завершён.'} description={position.status === 'BEFORE' ? `Старт — ${formatDate(store.cycle.startDate)}.` : 'Все 90 дней сохранены. Итог доступен в Progress.'} />
        <Card className="empty">{position.status === 'BEFORE' ? 'До старта можно изменить дату программы в Settings.' : 'Исторические данные доступны в календаре и отчётах.'}</Card>
      </>
    )
  }

  if (!plan || !scores) return <div className="page-loader">Создаём план дня…</div>

  return (
    <>
      <PageTitle
        eyebrow={`${formatDate(date, 'EEEE, d MMMM')} · DAY ${plan.programDay} / 90`}
        title={date === todayKey() ? `Сегодня · ${plan.phase}` : `${formatDate(date)} · ${plan.phase}`}
        description={plan.mode === 'normal' ? 'Факты автоматически определяют выполнение плана.' : plan.mode === 'minimum' ? 'Minimum Day сохраняет ритм, но не считается полным днём.' : 'Recovery — отдельный режим восстановления, не провал.'}
        action={<div className="date-navigation"><button className="icon-button secondary" onClick={() => changeDate(-1)}><ChevronLeft /></button><input aria-label="Дата журнала" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button className="icon-button secondary" disabled={date >= todayKey()} onClick={() => changeDate(1)}><ChevronRight /></button></div>}
      />

      <div className="flow-tabs">
        <button className={flow === 'morning' ? 'active' : ''} onClick={() => setFlow('morning')}><span>01</span> Утро · план</button>
        <button className={flow === 'evening' ? 'active' : ''} onClick={() => setFlow('evening')}><span>02</span> Вечер · факты</button>
      </div>

      {flow === 'morning' ? (
        <div className="today-flow">
          <Card className="checkin-card">
            <div className="section-heading"><div><span className="eyebrow">MORNING CHECK-IN</span><h2>Как ты восстановился?</h2></div><MoonStar /></div>
            <div className="form-grid two">
              <Field label="Заснул"><input type="time" value={sleep?.sleepOnset ?? ''} onChange={(event) => updateSleepTime('sleepOnset', event.target.value)} /></Field>
              <Field label="Проснулся"><input type="time" value={sleep?.wakeTime ?? ''} onChange={(event) => updateSleepTime('wakeTime', event.target.value)} /></Field>
              <Field label={`Качество · ${sleep?.quality ?? '—'}/10`}><input type="range" min="1" max="10" value={sleep?.quality ?? 5} onChange={(event) => store.updateSleep(date, { quality: Number(event.target.value) })} /></Field>
              <Field label={`Готовность · ${daily?.readiness ?? '—'}/5`}><input type="range" min="1" max="5" value={daily?.readiness ?? 3} onChange={(event) => store.updateDaily(date, { readiness: Number(event.target.value) })} /></Field>
            </div>
            <Field label="Состояние"><div className="condition-picker">{([
              ['normal', 'Normal'], ['tired', 'Tired'], ['pain', 'Pain'], ['ill', 'Ill'],
            ] as [DayCondition, string][]).map(([value, label]) => <button key={value} aria-label={label} className={daily?.condition === value ? 'active' : ''} onClick={() => store.updateDaily(date, { condition: value })}>{label}</button>)}</div></Field>
            <details><summary>Дополнительные данные сна</summary><div className="details-grid">
              <Field label="Лёг"><input type="time" value={sleep?.bedtime ?? ''} onChange={(event) => store.updateSleep(date, { bedtime: event.target.value })} /></Field>
              <Field label="Встал"><input type="time" value={sleep?.getUpTime ?? ''} onChange={(event) => store.updateSleep(date, { getUpTime: event.target.value })} /></Field>
              <Field label="Пробуждений"><input type="number" min="0" value={sleep?.awakenings ?? ''} onChange={(event) => store.updateSleep(date, { awakenings: Number(event.target.value) })} /></Field>
              <Field label="Последний кофе"><input type="time" value={sleep?.lastCaffeineAt ?? ''} onChange={(event) => store.updateSleep(date, { lastCaffeineAt: event.target.value })} /></Field>
            </div></details>
          </Card>

          <Card className="plan-card">
            <div className="section-heading"><div><span className="eyebrow">TODAY'S PLAN · {plan.mode.toUpperCase()}</span><h2>Что сделать сегодня</h2></div><span className={`mode-badge ${plan.mode}`}>{plan.mode}</span></div>
            <div className="mission-list">
              {plan.plannedActions.filter((action) => action.applicable && action.priority !== 'optional').map((action) => {
                const result = scores.actionEvaluations[action.id]
                const done = ['FULL', 'MINIMUM', 'RECOVERY_ACTION_FULL'].includes(result.status)
                return (
                  <button key={action.id} className={`mission evaluation-${result.status.toLowerCase()} ${done ? 'done' : ''}`} disabled={!action.manualAllowed} onClick={() => action.manualAllowed && store.toggleManualAction(date, action.id)}>
                    <span className="checkbox">{done && <Check size={15} />}</span>
                    <span><small>{action.domain} · {action.priority}</small><strong>{action.label}</strong><em>{result.explanation}</em></span>
                    <b className={`action-status ${result.status.toLowerCase()}`}>{statusLabels[result.status]}</b>
                  </button>
                )
              })}
            </div>
            <div className="plan-actions">
              <select aria-label="Причина изменения режима" value={modeReason} onChange={(event) => setModeReason(event.target.value)}>
                <option>Высокая нагрузка</option><option>Выраженная усталость</option><option>Боль</option><option>Болезнь</option><option>Другое</option>
              </select>
              {plan.mode !== 'minimum' && <button className="secondary" onClick={() => activateMode('minimum')}>Minimum Day</button>}
              {plan.mode !== 'recovery' && <button className="secondary" onClick={() => activateMode('recovery')}><ShieldCheck size={16} /> Recovery</button>}
              {plan.mode !== 'normal' && <button className="text-button" onClick={() => activateMode('normal')}>Вернуть исходный план</button>}
            </div>
            <small className="health-note">Recovery не является медицинской рекомендацией. При выраженной боли или ухудшении самочувствия не продолжай нагрузку через силу.</small>
          </Card>
        </div>
      ) : (
        <div className="evening-layout">
          <Card>
            <span className="eyebrow">MOVEMENT & BODY</span><h2>Что произошло?</h2>
            <div className="form-grid two">
              <Field label="Шаги"><input type="number" min="0" value={daily?.steps ?? ''} placeholder={String(plan.targetsSnapshot.stepsFull)} onChange={(event) => store.updateDaily(date, { steps: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /></Field>
              <Field label="Спокойное движение, мин"><input type="number" min="0" value={daily?.movementMinutes ?? ''} onChange={(event) => store.updateDaily(date, { movementMinutes: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /></Field>
              <Field label={`Вес, ${store.settings.units === 'metric' ? 'кг' : 'lb'}`}><div className="inline-action"><input type="number" step=".1" value={weight} placeholder={latestWeight ? String(latestWeight.value) : '—'} onChange={(event) => setWeight(event.target.value)} /><button className="secondary" onClick={addWeight}>Добавить</button></div></Field>
              <Field label="Сложность дня"><select value={daily?.difficulty ?? ''} onChange={(event) => store.updateDaily(date, { difficulty: event.target.value as DailyLogDifficulty })}><option value="">Не выбрано</option><option value="easier">Легче плана</option><option value="as-planned">По плану</option><option value="harder">Тяжелее плана</option></select></Field>
            </div>
            {latestWeight?.suspicious && !latestWeight.confirmed && <div className="soft-note">Изменение веса больше 3%. Проверь значение. <button className="text-button" onClick={() => store.confirmWeight(latestWeight.id)}>Подтвердить</button></div>}
          </Card>

          <Card>
            <span className="eyebrow">NUTRITION</span><h2>Быстрая фиксация</h2>
            <div className="form-grid two">
              <Field label="Приёмов пищи"><input type="number" min="0" max="10" value={nutrition?.meals ?? ''} onChange={(event) => store.updateNutrition(date, { meals: event.target.value === '' ? undefined : Number(event.target.value) })} /></Field>
              <Field label="Кофе"><input type="number" min="0" max="15" value={nutrition?.coffee ?? ''} onChange={(event) => store.updateNutrition(date, { coffee: event.target.value === '' ? undefined : Number(event.target.value) })} /></Field>
              <BooleanChoice label="Сладкое" value={nutrition?.sweets} onChange={(value) => store.updateNutrition(date, { sweets: value })} />
              <BooleanChoice label="Fast food" value={nutrition?.fastFood} onChange={(value) => store.updateNutrition(date, { fastFood: value })} />
            </div>
            {plan.targetsSnapshot.nutritionMode === 'advanced' && <div className="advanced-inline">
              <input placeholder="Блюдо" value={food.name} onChange={(event) => setFood({ ...food, name: event.target.value })} />
              <input type="number" placeholder="Ккал" value={food.calories} onChange={(event) => setFood({ ...food, calories: event.target.value })} />
              <input type="number" placeholder="Белок" value={food.protein} onChange={(event) => setFood({ ...food, protein: event.target.value })} />
              <button className="secondary" onClick={addFood}>Добавить</button>
            </div>}
          </Card>

          <Card className="session-summary">
            <span className="eyebrow">SESSIONS</span><h2>Тренировка и Mind</h2>
            <Link to="/training"><Dumbbell /><span><b>{plan.targetsSnapshot.workoutTemplate ? `Workout ${plan.targetsSnapshot.workoutTemplate}` : 'День без силовой'}</b><small>{scores.domainScores.training !== undefined ? `${scores.domainScores.training}/100` : 'Нет факта'}</small></span><ChevronRight /></Link>
            <Link to="/brain"><Brain /><span><b>Brain · {plan.targetsSnapshot.brainMinutesFull} минут</b><small>{scores.domainScores.mind !== undefined ? `${scores.domainScores.mind}/100` : 'Нет факта'}</small></span><ChevronRight /></Link>
            <Field label="Заметка"><textarea rows={2} value={daily?.note ?? ''} onChange={(event) => store.updateDaily(date, { note: event.target.value })} /></Field>
          </Card>

          <Card className="day-result">
            <div><span className="eyebrow">EXECUTION</span><Ring value={scores.executionScore ?? 0} size={104} /><small>{scores.executionScore === undefined ? 'Нет подтверждённых действий' : 'Выполнение плана'}</small></div>
            <div><span className="eyebrow">DAY SCORE</span><Ring value={scores.dayScore ?? 0} size={104} /><small>{scores.preliminary ? 'Предварительно · мало данных' : `Полнота данных ${scores.completeness}%`}</small></div>
            <div className="result-actions"><b>{scores.dayStatus}</b><button className="primary" onClick={() => store.closeDay(date)}>{daily?.closedAt ? 'Пересчитать день' : 'Завершить день'}</button></div>
          </Card>
        </div>
      )}
    </>
  )
}

type DailyLogDifficulty = 'easier' | 'as-planned' | 'harder'

function BooleanChoice({ label, value, onChange }: { label: string; value?: boolean; onChange: (value: boolean) => void }) {
  return <Field label={label}><div className="boolean-choice"><button aria-label="Нет" className={value === false ? 'active' : ''} onClick={() => onChange(false)}>Нет</button><button aria-label="Да" className={value === true ? 'active' : ''} onClick={() => onChange(true)}>Да</button></div></Field>
}
