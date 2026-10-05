import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Brain, Check, ChevronLeft, ChevronRight, Dumbbell, ShieldCheck, Utensils } from 'lucide-react'
import { Card, Field, PageTitle, Ring } from '../components'
import { actionStatusLabel, dayStatusLabel, domainLabel, modeLabel, phaseLabel } from '../localization'
import { calculateScores } from '../scoring'
import { useAppStore } from '../store'
import { formatDate, getProgramPosition, minutesBetween, todayKey } from '../utils'

export function TodayPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const [flow, setFlow] = useState<'plan' | 'results'>('plan')
  const [modeReason, setModeReason] = useState('Высокая нагрузка')
  const position = getProgramPosition(store.cycle.startDate, date)
  const ensureDailyPlan = store.ensureDailyPlan

  useEffect(() => {
    ensureDailyPlan(date)
  }, [date, ensureDailyPlan])

  const plan = store.dailyPlans[date]
  const daily = store.dailyLogs[date]
  const sleep = store.sleepLogs[date]
  const scores = useMemo(() => plan ? calculateScores(store, plan) : undefined, [store, plan])

  const changeDate = (amount: number) => setDate(format(addDays(parseISO(date), amount), 'yyyy-MM-dd'))
  const updateSleepTime = (key: 'sleepOnset' | 'wakeTime', value: string) => {
    const next = { ...sleep, [key]: value }
    store.updateSleep(date, { [key]: value, durationMinutes: minutesBetween(next.sleepOnset, next.wakeTime) })
  }
  const activateMode = (mode: 'normal' | 'minimum' | 'recovery') => {
    store.setDayMode(date, mode, mode === 'normal' ? 'Возврат к исходному плану' : modeReason)
  }

  if (position.status !== 'ACTIVE') {
    return <>
      <PageTitle eyebrow="ПЕРСОНАЛЬНЫЕ 90" title={position.status === 'BEFORE' ? 'Цикл ещё не начался.' : 'Цикл завершён.'} description={position.status === 'BEFORE' ? `Старт — ${formatDate(store.cycle.startDate)}.` : 'Все 90 дней сохранены. Итоги доступны в разделе прогресса.'} />
      <Card className="empty">{position.status === 'BEFORE' ? 'До старта можно изменить дату программы в настройках.' : 'История доступна в календаре и отчётах.'}</Card>
    </>
  }
  if (!plan || !scores) return <div className="page-loader">Создаём план дня…</div>

  return (
    <>
      <PageTitle
        eyebrow={`${formatDate(date, 'EEEE, d MMMM')} · ДЕНЬ ${plan.programDay} ИЗ 90`}
        title={date === todayKey() ? `Сегодня · ${phaseLabel[plan.phase]}` : `${formatDate(date)} · ${phaseLabel[plan.phase]}`}
        description={plan.mode === 'normal' ? 'Перед тобой весь план на сегодня. Выполнение определяется по фактическим данным.' : plan.mode === 'minimum' ? 'Минимальный день помогает сохранить ритм и не считается полным.' : 'День восстановления учитывается отдельно и не является неудачей.'}
        action={<div className="date-navigation"><button aria-label="Предыдущий день" className="icon-button secondary" onClick={() => changeDate(-1)}><ChevronLeft /></button><input aria-label="Дата журнала" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button aria-label="Следующий день" className="icon-button secondary" disabled={date >= todayKey()} onClick={() => changeDate(1)}><ChevronRight /></button></div>}
      />

      <div className="flow-tabs">
        <button className={flow === 'plan' ? 'active' : ''} onClick={() => setFlow('plan')}><span>01</span> План дня</button>
        <button className={flow === 'results' ? 'active' : ''} onClick={() => setFlow('results')}><span>02</span> Итоги дня</button>
      </div>

      {flow === 'plan' ? (
        <Card className="plan-card main-plan">
          <div className="section-heading"><div><span className="eyebrow">ПЛАН НА СЕГОДНЯ</span><h2>Что нужно сделать</h2></div><span className={`mode-badge ${plan.mode}`}>{modeLabel[plan.mode]}</span></div>
          <div className="mission-list">
            {plan.plannedActions.filter((action) => action.applicable && action.priority !== 'optional').map((action) => {
              const result = scores.actionEvaluations[action.id]
              const done = ['FULL', 'MINIMUM', 'RECOVERY_ACTION_FULL'].includes(result.status)
              return <button key={action.id} className={`mission evaluation-${result.status.toLowerCase()} ${done ? 'done' : ''}`} disabled={!action.manualAllowed} onClick={() => action.manualAllowed && store.toggleManualAction(date, action.id)}>
                <span className="checkbox">{done && <Check size={15} />}</span>
                <span><small>{domainLabel[action.domain]} · {action.priority === 'core' ? 'главное' : 'дополнительно'}</small><strong>{action.label}</strong><em>{result.explanation}</em></span>
                <b className={`action-status ${result.status.toLowerCase()}`}>{actionStatusLabel[result.status]}</b>
              </button>
            })}
          </div>
          <div className="plan-actions">
            <select aria-label="Причина изменения режима" value={modeReason} onChange={(event) => setModeReason(event.target.value)}>
              <option>Высокая нагрузка</option><option>Выраженная усталость</option><option>Боль</option><option>Болезнь</option><option>Другое</option>
            </select>
            {plan.mode !== 'minimum' && <button className="secondary" onClick={() => activateMode('minimum')}>Упростить день</button>}
            {plan.mode !== 'recovery' && <button className="secondary" onClick={() => activateMode('recovery')}><ShieldCheck size={16} /> Восстановление</button>}
            {plan.mode !== 'normal' && <button className="text-button" onClick={() => activateMode('normal')}>Вернуть обычный план</button>}
          </div>
          <small className="health-note">Режим восстановления не является медицинской рекомендацией. При выраженной боли или ухудшении самочувствия не продолжай нагрузку через силу.</small>
        </Card>
      ) : (
        <div className="evening-layout">
          <Card>
            <span className="eyebrow">СОН</span><h2>Как прошла ночь</h2>
            <div className="form-grid two">
              <Field label="Заснул"><input type="time" value={sleep?.sleepOnset ?? ''} onChange={(event) => updateSleepTime('sleepOnset', event.target.value)} /></Field>
              <Field label="Проснулся"><input type="time" value={sleep?.wakeTime ?? ''} onChange={(event) => updateSleepTime('wakeTime', event.target.value)} /></Field>
              <Field label={`Качество · ${sleep?.quality ?? '—'}/10`}><input type="range" min="1" max="10" value={sleep?.quality ?? 5} onChange={(event) => store.updateSleep(date, { quality: Number(event.target.value) })} /></Field>
              <Field label="Пробуждений"><input type="number" min="0" value={sleep?.awakenings ?? ''} onChange={(event) => store.updateSleep(date, { awakenings: Number(event.target.value) })} /></Field>
            </div>
            <details><summary>Дополнительные данные</summary><div className="details-grid">
              <Field label="Лёг"><input type="time" value={sleep?.bedtime ?? ''} onChange={(event) => store.updateSleep(date, { bedtime: event.target.value })} /></Field>
              <Field label="Встал"><input type="time" value={sleep?.getUpTime ?? ''} onChange={(event) => store.updateSleep(date, { getUpTime: event.target.value })} /></Field>
              <Field label="Дневной сон, мин"><input type="number" min="0" value={sleep?.napMinutes ?? ''} onChange={(event) => store.updateSleep(date, { napMinutes: Number(event.target.value) })} /></Field>
              <Field label="Последний кофе"><input type="time" value={sleep?.lastCaffeineAt ?? ''} onChange={(event) => store.updateSleep(date, { lastCaffeineAt: event.target.value })} /></Field>
            </div></details>
          </Card>

          <Card>
            <span className="eyebrow">ДВИЖЕНИЕ</span><h2>Активность за день</h2>
            <div className="form-grid two">
              <Field label="Шаги"><input type="number" min="0" value={daily?.steps ?? ''} placeholder={String(plan.targetsSnapshot.stepsFull)} onChange={(event) => store.updateDaily(date, { steps: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /></Field>
              <Field label="Спокойное движение, мин"><input type="number" min="0" value={daily?.movementMinutes ?? ''} onChange={(event) => store.updateDaily(date, { movementMinutes: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /></Field>
              <Field label="Сложность дня"><select value={daily?.difficulty ?? ''} onChange={(event) => store.updateDaily(date, { difficulty: event.target.value as DailyLogDifficulty })}><option value="">Не выбрано</option><option value="easier">Легче плана</option><option value="as-planned">По плану</option><option value="harder">Тяжелее плана</option></select></Field>
              <Field label="Заметка"><input value={daily?.note ?? ''} onChange={(event) => store.updateDaily(date, { note: event.target.value })} /></Field>
            </div>
          </Card>

          <Card className="session-summary">
            <span className="eyebrow">ОСТАЛЬНЫЕ ФАКТЫ</span><h2>Заполни отдельные разделы</h2>
            <Link to="/nutrition"><Utensils /><span><b>Питание и вес</b><small>{scores.domainScores.nutrition !== undefined ? `Оценка ${scores.domainScores.nutrition} из 100` : 'Нет данных'}</small></span><ChevronRight /></Link>
            <Link to="/training"><Dumbbell /><span><b>Тренировка</b><small>{scores.domainScores.training !== undefined ? `Оценка ${scores.domainScores.training} из 100` : plan.targetsSnapshot.workoutTemplate ? 'Запланирована' : 'Сегодня не запланирована'}</small></span><ChevronRight /></Link>
            <Link to="/brain"><Brain /><span><b>Развитие мышления · {plan.targetsSnapshot.brainMinutesFull} минут</b><small>{scores.domainScores.mind !== undefined ? `Оценка ${scores.domainScores.mind} из 100` : 'Нет данных'}</small></span><ChevronRight /></Link>
          </Card>

          <Card className="day-result">
            <div><span className="eyebrow">ВЫПОЛНЕНИЕ ПЛАНА</span><Ring value={scores.executionScore ?? 0} size={104} /><small>{scores.executionScore === undefined ? 'Нет подтверждённых действий' : 'Что сделано из запланированного'}</small></div>
            <div><span className="eyebrow">ОЦЕНКА ДНЯ</span><Ring value={scores.dayScore ?? 0} size={104} /><small>{scores.preliminary ? 'Предварительно · мало данных' : `Полнота данных ${scores.completeness}%`}</small></div>
            <div className="result-actions"><b>{dayStatusLabel[scores.dayStatus]}</b><button className="primary" onClick={() => store.closeDay(date)}>{daily?.closedAt ? 'Пересчитать день' : 'Завершить день'}</button></div>
          </Card>
        </div>
      )}
    </>
  )
}

type DailyLogDifficulty = 'easier' | 'as-planned' | 'harder'
