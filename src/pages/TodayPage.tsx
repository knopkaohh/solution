import { useState } from 'react'
import { Brain, Check, ChevronRight, Coffee, Footprints, MoonStar, Plus, Scale, Trash2, Utensils } from 'lucide-react'
import { Card, Field, PageTitle, Ring } from '../components'
import { getBrainTask, getMissions, getPhase, getStepGoal } from '../program'
import { useAppStore } from '../store'
import { calculateDayScore, formatDate, formatDuration, getProgramDay, minutesBetween, todayKey, uid } from '../utils'

export function TodayPage() {
  const store = useAppStore()
  const date = todayKey()
  const day = getProgramDay(store.settings.programStart)
  const phase = getPhase(day)
  const missions = getMissions(day, date, store.settings)
  const daily = store.dailyLogs[date] ?? { date, completedTaskIds: [] }
  const sleep = store.sleepLogs[date]
  const nutrition = store.nutritionLogs[date] ?? { date, meals: 0, sweets: false, coffee: 0, items: [] }
  const brainDone = store.brainSessions.some((session) => session.date === date && session.completed)
  const workoutDone = store.workouts.some((session) => session.date === date && session.completed)
  const brainTask = getBrainTask(day)
  const stepGoal = getStepGoal(day, store.settings)
  const { score, breakdown } = calculateDayScore(store, date)
  const [logOpen, setLogOpen] = useState(false)
  const [mealType, setMealType] = useState<'Завтрак' | 'Обед' | 'Ужин' | 'Перекус'>('Обед')
  const [food, setFood] = useState({ name: '', amount: '', calories: '', protein: '', fat: '', carbs: '' })

  const updateSleepTime = (key: 'fellAsleep' | 'wokeUp', value: string) => {
    const next = { ...sleep, [key]: value }
    store.updateSleep(date, { [key]: value, durationMinutes: minutesBetween(next.fellAsleep, next.wokeUp) })
  }

  const completeBrain = () => {
    const previous = store.brainSessions.find((session) => session.date === date)
    store.saveBrainSession({
      id: previous?.id ?? uid(), date, category: brainTask.category,
      minutes: store.settings.brainMinutes, completed: !brainDone,
    })
  }
  const addFood = () => {
    if (!food.name.trim()) return
    store.updateNutrition(date, {
      items: [...nutrition.items, {
        id: uid(), meal: mealType, name: food.name.trim(), amount: food.amount,
        calories: Number(food.calories) || undefined, protein: Number(food.protein) || undefined,
        fat: Number(food.fat) || undefined, carbs: Number(food.carbs) || undefined,
      }],
      meals: Math.max(nutrition.meals, new Set([...nutrition.items.map((item) => item.meal), mealType]).size),
    })
    setFood({ name: '', amount: '', calories: '', protein: '', fat: '', carbs: '' })
  }

  return (
    <>
      <PageTitle
        eyebrow={`${formatDate(date, 'EEEE, d MMMM')} · Москва`}
        title={`Добрый вечер, ${store.settings.name}.`}
        description={`День ${day} из 90 · ${phase.name}. Сегодня достаточно сделать главное.`}
        action={<button className="primary" onClick={() => setLogOpen(!logOpen)}><Plus size={18} /> Быстрый check-in</button>}
      />

      {logOpen && (
        <Card className="quick-log">
          <div className="section-heading"><div><span className="eyebrow">DAILY LOG</span><h2>Быстрый check-in</h2></div><button className="text-button" onClick={() => setLogOpen(false)}>Готово</button></div>
          <div className="form-grid">
            <Field label="Вес, кг"><input type="number" step=".1" value={daily.weight ?? ''} placeholder="120.0" onChange={(e) => store.updateDaily(date, { weight: Number(e.target.value) || undefined })} /></Field>
            <Field label="Шаги"><input type="number" value={daily.steps ?? ''} placeholder="0" onChange={(e) => store.updateDaily(date, { steps: Number(e.target.value) || undefined })} /></Field>
            <Field label="Заснул"><input type="time" value={sleep?.fellAsleep ?? ''} onChange={(e) => updateSleepTime('fellAsleep', e.target.value)} /></Field>
            <Field label="Проснулся"><input type="time" value={sleep?.wokeUp ?? ''} onChange={(e) => updateSleepTime('wokeUp', e.target.value)} /></Field>
            <Field label="Качество сна"><input type="range" min="1" max="10" value={sleep?.quality ?? 5} onChange={(e) => store.updateSleep(date, { quality: Number(e.target.value) })} /><b>{sleep?.quality ?? 5}/10</b></Field>
            <Field label="Приёмов пищи"><input type="number" min="0" max="8" value={nutrition.meals} onChange={(e) => store.updateNutrition(date, { meals: Number(e.target.value) })} /></Field>
          </div>
        </Card>
      )}

      <div className="dashboard-grid">
        <Card className="score-card">
          <div>
            <span className="eyebrow">DAY SCORE</span>
            <h2>Выполнение системы</h2>
            <p>Не оценка здоровья. Просто ориентир, насколько план дня выполнен.</p>
          </div>
          <Ring value={score} />
          <div className="score-breakdown">
            {Object.entries(breakdown).map(([label, value]) => {
              const max = label === 'Сон' || label === 'Движение' || label === 'Мозг' ? 20 : label === 'Дисциплина' ? 10 : 15
              return <div key={label}><span>{label}</span><i><b style={{ width: `${(value / max) * 100}%` }} /></i><em>+{value}</em></div>
            })}
          </div>
        </Card>

        <Card className="missions-card">
          <div className="section-heading"><div><span className="eyebrow">TODAY'S MISSIONS</span><h2>{daily.completedTaskIds.length} из {missions.length} выполнено</h2></div><span className="calm-pill">NO ZERO DAY</span></div>
          <div className="mission-list">
            {missions.map((mission) => {
              const done = daily.completedTaskIds.includes(mission.id)
              return (
                <button key={mission.id} className={`mission ${done ? 'done' : ''}`} onClick={() => store.toggleTask(date, mission.id)}>
                  <span className="checkbox">{done && <Check size={15} />}</span>
                  <span><small>{mission.area}</small><strong>{mission.title}</strong><em>{mission.detail}</em></span>
                  <ChevronRight size={18} />
                </button>
              )
            })}
          </div>
          <p className="reassurance">Один сложный день не обнуляет систему. Завтра просто продолжаем.</p>
        </Card>
      </div>

      <div className="metric-grid">
        <Card className="daily-card">
          <div className="card-icon"><MoonStar /></div><span className="eyebrow">СОН</span>
          <h3>{formatDuration(sleep?.durationMinutes)}</h3>
          <p>{sleep?.fellAsleep || '—'} → {sleep?.wokeUp || '—'} <span>· цель {store.settings.sleepTarget} → {store.settings.wakeTarget}</span></p>
          <div className="mini-row"><span>Качество</span><b>{sleep?.quality ? `${sleep.quality}/10` : 'Не указано'}</b></div>
          <details><summary>Добавить детали</summary><div className="details-grid">
            <Field label="Лёг"><input type="time" value={sleep?.wentToBed ?? ''} onChange={(e) => store.updateSleep(date, { wentToBed: e.target.value })} /></Field>
            <Field label="Встал"><input type="time" value={sleep?.gotUp ?? ''} onChange={(e) => store.updateSleep(date, { gotUp: e.target.value })} /></Field>
            <Field label="Пробуждений"><input type="number" min="0" value={sleep?.awakenings ?? ''} onChange={(e) => store.updateSleep(date, { awakenings: Number(e.target.value) })} /></Field>
            <Field label="Дневной сон, мин"><input type="number" min="0" value={sleep?.napMinutes ?? ''} onChange={(e) => store.updateSleep(date, { napMinutes: Number(e.target.value) })} /></Field>
          </div></details>
          <small className="health-note">Если храп или нарушения сна выражены, их стоит спокойно обсудить с врачом. Приложение не ставит диагнозов.</small>
        </Card>

        <Card className="daily-card">
          <div className="card-icon"><Footprints /></div><span className="eyebrow">BODY</span>
          <h3>{(daily.steps ?? 0).toLocaleString('ru-RU')} <small>/ {stepGoal.toLocaleString('ru-RU')}</small></h3>
          <div className="progress large"><i style={{ width: `${Math.min(100, ((daily.steps ?? 0) / stepGoal) * 100)}%` }} /></div>
          <div className="mini-row"><span><Scale size={15} /> Вес</span><b>{daily.weight ? `${daily.weight} кг` : 'Добавить'}</b></div>
          <div className="mini-row"><span>Тренировка</span><b className={workoutDone ? 'positive' : ''}>{workoutDone ? 'Выполнена' : missions.some((m) => m.area === 'GYM') ? 'Запланирована' : 'День восстановления'}</b></div>
        </Card>

        <Card className="daily-card">
          <div className="card-icon"><Utensils /></div><span className="eyebrow">NUTRITION · {store.settings.nutritionMode}</span>
          <h3>{nutrition.meals} <small>приёма пищи</small></h3>
          <div className="counter-row"><span>Сладкое</span><button className={nutrition.sweets ? 'selected' : ''} onClick={() => store.updateNutrition(date, { sweets: !nutrition.sweets })}>{nutrition.sweets ? 'Да' : 'Нет'}</button></div>
          <div className="counter-row"><span><Coffee size={15} /> Кофе</span><div><button onClick={() => store.updateNutrition(date, { coffee: Math.max(0, nutrition.coffee - 1) })}>−</button><b>{nutrition.coffee}</b><button onClick={() => store.updateNutrition(date, { coffee: nutrition.coffee + 1 })}>+</button></div></div>
          <div className="mini-row"><span>Оценка питания</span><b>{nutrition.rating ? `${nutrition.rating}/10` : 'Не указано'}</b></div>
          <details><summary>Оценить питание</summary><Field label={`${nutrition.rating ?? 5} / 10`}><input type="range" min="1" max="10" value={nutrition.rating ?? 5} onChange={(e) => store.updateNutrition(date, { rating: Number(e.target.value) })} /></Field></details>
        </Card>

        <Card className="daily-card">
          <div className="card-icon"><Brain /></div><span className="eyebrow">{brainTask.category}</span>
          <h3>{brainTask.title}</h3><p>{brainTask.detail}</p>
          <button className={brainDone ? 'complete-button done' : 'complete-button'} onClick={completeBrain}>{brainDone ? <><Check size={17} /> Выполнено</> : `Начать · ${store.settings.brainMinutes} мин`}</button>
        </Card>
      </div>
      {store.settings.nutritionMode === 'advanced' && (
        <Card className="nutrition-advanced">
          <div className="section-heading"><div><span className="eyebrow">ADVANCED NUTRITION</span><h2>Дневник питания</h2></div><span className="calm-pill">ВСЕ ПОЛЯ ОПЦИОНАЛЬНЫ</span></div>
          <div className="meal-picker">{(['Завтрак', 'Обед', 'Ужин', 'Перекус'] as const).map((meal) => <button key={meal} className={mealType === meal ? 'active' : ''} onClick={() => setMealType(meal)}>{meal}</button>)}</div>
          <div className="food-form">
            <Field label="Блюдо"><input placeholder="Например, гречка с курицей" value={food.name} onChange={(e) => setFood({ ...food, name: e.target.value })} /></Field>
            <Field label="Количество"><input placeholder="300 г" value={food.amount} onChange={(e) => setFood({ ...food, amount: e.target.value })} /></Field>
            {(['calories', 'protein', 'fat', 'carbs'] as const).map((key) => <Field key={key} label={{ calories: 'Ккал', protein: 'Белок', fat: 'Жиры', carbs: 'Углеводы' }[key]}><input type="number" value={food[key]} onChange={(e) => setFood({ ...food, [key]: e.target.value })} /></Field>)}
            <button className="primary" onClick={addFood}><Plus size={16} />Добавить</button>
          </div>
          {nutrition.items.length > 0 && <div className="food-list">{nutrition.items.map((item) => <div key={item.id}><span><small>{item.meal}</small><b>{item.name}</b><em>{item.amount}</em></span><span>{item.calories ?? '—'} ккал · Б {item.protein ?? '—'} · Ж {item.fat ?? '—'} · У {item.carbs ?? '—'}</span><button className="icon-button" onClick={() => store.updateNutrition(date, { items: nutrition.items.filter((foodItem) => foodItem.id !== item.id) })}><Trash2 size={15} /></button></div>)}</div>}
        </Card>
      )}
    </>
  )
}
