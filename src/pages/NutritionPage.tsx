import { useState } from 'react'
import { Check, Droplets, Scale, Utensils } from 'lucide-react'
import { Card, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import type { NutritionLog } from '../types'
import { formatDate, todayKey } from '../utils'

const qualityOptions: { value: NonNullable<NutritionLog['quality']>; label: string; detail: string }[] = [
  { value: 'poor', label: 'Плохо', detail: 'Питание было хаотичным или не устроило меня' },
  { value: 'average', label: 'Средне', detail: 'Обычный день без особого контроля' },
  { value: 'excellent', label: 'Отлично', detail: 'Питание было предсказуемым и меня устроило' },
]

export function NutritionPage() {
  const store = useAppStore()
  const [date, setDate] = useState(todayKey())
  const [weight, setWeight] = useState('')
  const [saved, setSaved] = useState(false)
  const log = store.nutritionLogs[date]
  const dayWeight = [...store.weightMeasurements].filter((item) => item.timestamp.startsWith(date)).at(-1)

  const update = (patch: Partial<NutritionLog>) => {
    store.updateNutrition(date, patch)
    setSaved(false)
  }
  const addWeight = () => {
    const value = Number(weight)
    if (value > 0) {
      store.addWeight(date, value)
      setWeight('')
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="ПИТАНИЕ"
        title="Как ты сегодня питался?"
        description="Без подсчёта каждой калории. Зафиксируй общую оценку, жидкость и короткий комментарий."
        action={<input className="date-input" aria-label="Дата питания" type="date" value={date} max={todayKey()} onChange={(event) => { setDate(event.target.value); setSaved(false) }} />}
      />
      <div className="nutrition-page">
        <Card className="nutrition-quality-card">
          <div className="section-heading"><div><span className="eyebrow">{formatDate(date).toUpperCase()}</span><h2>Общая оценка</h2></div><Utensils /></div>
          <div className="quality-options">
            {qualityOptions.map((option) => <button key={option.value} className={log?.quality === option.value ? 'active' : ''} onClick={() => update({ quality: option.value })}>
              <span className="quality-dot" /><strong>{option.label}</strong><small>{option.detail}</small>
            </button>)}
          </div>
          <Field label="Что и как я сегодня ел"><textarea rows={5} placeholder="Например: утром пропустил завтрак, днём был плов, вечером гречка с мясом…" value={log?.comment ?? ''} onChange={(event) => update({ comment: event.target.value })} /></Field>
        </Card>

        <div className="nutrition-side">
          <Card>
            <div className="section-heading"><div><span className="eyebrow">ЖИДКОСТЬ</span><h2>Сколько выпил</h2></div><Droplets /></div>
            <Field label="Литры"><div className="inline-input"><input type="number" min="0" step=".1" value={log?.fluidMl === undefined ? '' : log.fluidMl / 1000} placeholder="0.0" onChange={(event) => update({ fluidMl: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) * 1000) })} /><span>л</span></div></Field>
            <p className="footnote">Это просто дневная запись, а не медицинская норма.</p>
          </Card>

          <Card>
            <div className="section-heading"><div><span className="eyebrow">ТЕКУЩИЙ ВЕС</span><h2>{dayWeight ? `${dayWeight.value} ${dayWeight.unit === 'kg' ? 'кг' : 'фунт.'}` : 'Не указан'}</h2></div><Scale /></div>
            <Field label={`Вес, ${store.settings.units === 'metric' ? 'кг' : 'фунты'}`}><div className="inline-action"><input type="number" step=".1" value={weight} placeholder={dayWeight ? String(dayWeight.value) : '—'} onChange={(event) => setWeight(event.target.value)} /><button className="secondary" onClick={addWeight}>Добавить</button></div></Field>
            {dayWeight?.suspicious && !dayWeight.confirmed && <div className="soft-note">Изменение больше 3%. Проверь значение. <button className="text-button" onClick={() => store.confirmWeight(dayWeight.id)}>Подтвердить</button></div>}
          </Card>

          <button className="primary nutrition-save" onClick={() => setSaved(true)}><Check size={17} /> {saved ? 'Сохранено' : 'Сохранить питание'}</button>
        </div>
      </div>
    </>
  )
}
