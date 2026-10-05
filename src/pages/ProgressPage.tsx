import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, TrendingUp } from 'lucide-react'
import { Card, Empty, Field, PageTitle } from '../components'
import { useAppStore } from '../store'
import type { ReviewRatings, WeeklyReview } from '../types'
import { calculateDayScore, dateForDay, formatDuration, getProgramDay, todayKey } from '../utils'

const defaultRatings: ReviewRatings = { body: 5, sleep: 5, mind: 5, discipline: 5, wellbeing: 5 }

export function ProgressPage() {
  const store = useAppStore()
  const day = getProgramDay(store.settings.programStart)
  const [tab, setTab] = useState<'overview' | 'review'>('overview')
  const week = Math.ceil(day / 7)
  const oldReview = store.weeklyReviews.find((item) => item.week === week)
  const [review, setReview] = useState<WeeklyReview>(oldReview ?? {
    week, createdAt: todayKey(), wins: '', misses: '', hardest: '', blockers: '', change: '', ratings: defaultRatings,
  })
  const [saved, setSaved] = useState(false)

  const points = Array.from({ length: day }, (_, i) => {
    const date = dateForDay(store.settings.programStart, i + 1)
    const daily = store.dailyLogs[date]
    const sleep = store.sleepLogs[date]
    return {
      day: i + 1, weight: daily?.weight, steps: daily?.steps,
      sleep: sleep?.durationMinutes ? +(sleep.durationMinutes / 60).toFixed(1) : undefined,
      quality: sleep?.quality, score: calculateDayScore(store, date).score || undefined,
    }
  })
  const hasData = points.some((p) => p.weight || p.steps || p.sleep)
  const loggedDays = Object.keys(store.dailyLogs).length
  const avgScore = loggedDays ? Math.round(Object.keys(store.dailyLogs).reduce((sum, date) => sum + calculateDayScore(store, date).score, 0) / loggedDays) : 0
  const sleepValues = Object.values(store.sleepLogs).filter((item) => item.durationMinutes)
  const avgSleep = sleepValues.length ? Math.round(sleepValues.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0) / sleepValues.length) : 0
  const ratingFields: [keyof ReviewRatings, string][] = [['body', 'Тело'], ['sleep', 'Сон'], ['mind', 'Мозг'], ['discipline', 'Дисциплина'], ['wellbeing', 'Самочувствие']]

  if (day >= 90 && store.monthlyReviews.some((r) => r.day === 90)) return <FinalReport />

  return (
    <>
      <PageTitle eyebrow="PROGRESS" title="Смотри на тренд." description="Отдельный день — шум. Несколько недель показывают направление." action={<div className="segmented"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Обзор</button><button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Weekly review</button></div>} />
      {tab === 'overview' ? <>
        <div className="progress-kpis">
          <Card><span>Текущий вес</span><strong>{Object.values(store.dailyLogs).filter((l) => l.weight).at(-1)?.weight ?? '—'} <small>кг</small></strong><em>Старт: 120 кг</em></Card>
          <Card><span>Средний сон</span><strong>{avgSleep ? formatDuration(avgSleep) : '—'}</strong><em>{sleepValues.length} записей</em></Card>
          <Card><span>Тренировки</span><strong>{store.workouts.filter((w) => w.completed).length}</strong><em>за текущий цикл</em></Card>
          <Card><span>Дисциплина</span><strong>{avgScore}<small>%</small></strong><em>{loggedDays} дней с данными</em></Card>
        </div>
        {!hasData ? <Card><Empty>Добавь первые данные на экране «Сегодня» — графики появятся автоматически.</Empty></Card> :
        <div className="chart-grid">
          <ChartCard title="Вес" unit="кг"><ResponsiveContainer width="100%" height={240}><LineChart data={points}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" /><YAxis domain={['auto', 'auto']} /><Tooltip /><Line connectNulls type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Шаги" unit="в день"><ResponsiveContainer width="100%" height={240}><BarChart data={points}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="steps" fill="var(--blue)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Сон" unit="часов"><ResponsiveContainer width="100%" height={240}><LineChart data={points}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" /><YAxis domain={[0, 12]} /><Tooltip /><Line connectNulls type="monotone" dataKey="sleep" stroke="var(--violet)" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Выполнение" unit="score"><ResponsiveContainer width="100%" height={240}><LineChart data={points}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" /><YAxis domain={[0, 100]} /><Tooltip /><Line connectNulls type="monotone" dataKey="score" stroke="var(--orange)" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
        </div>}
        {[30, 60, 90].includes(day) && <MilestoneReview day={day as 30 | 60 | 90} />}
      </> : (
        <Card className="review-card">
          <div className="section-heading"><div><span className="eyebrow">НЕДЕЛЯ {week}</span><h2>Weekly review</h2><p>Несколько честных предложений помогут скорректировать систему.</p></div><TrendingUp /></div>
          <div className="review-questions">
            {[['wins', 'Что получилось?'], ['misses', 'Что не получилось?'], ['hardest', 'Что было самым сложным?'], ['blockers', 'Что мешало?'], ['change', 'Что изменить на следующей неделе?']].map(([key, label]) =>
              <Field key={key} label={label}><textarea rows={2} value={review[key as keyof Pick<WeeklyReview, 'wins' | 'misses' | 'hardest' | 'blockers' | 'change'>]} onChange={(e) => setReview({ ...review, [key]: e.target.value })} /></Field>
            )}
          </div>
          <div className="ratings">
            {ratingFields.map(([key, label]) => <Field key={key} label={label}><input type="range" min="1" max="10" value={review.ratings[key]} onChange={(e) => setReview({ ...review, ratings: { ...review.ratings, [key]: Number(e.target.value) } })} /><b>{review.ratings[key]}/10</b></Field>)}
          </div>
          <button className="primary" onClick={() => { store.saveWeeklyReview(review); setSaved(true) }}>{saved ? <><Check /> Сохранено</> : 'Сохранить review'}</button>
        </Card>
      )}
    </>
  )
}

function ChartCard({ title, unit, children }: { title: string; unit: string; children: React.ReactNode }) {
  return <Card className="chart-card"><div><span className="eyebrow">{title.toUpperCase()}</span><small>{unit}</small></div>{children}</Card>
}

function MilestoneReview({ day }: { day: 30 | 60 | 90 }) {
  const store = useAppStore()
  const [note, setNote] = useState('')
  return <Card className="milestone"><span className="eyebrow">DAY {day} REVIEW</span><h2>{day === 90 ? 'Финальная точка цикла' : 'Время настроить следующий этап'}</h2><p>Посмотри на факты выше и зафиксируй главное. Цели можно изменить в настройках.</p><textarea rows={3} placeholder="Что я беру с собой дальше?" value={note} onChange={(e) => setNote(e.target.value)} /><button className="primary" onClick={() => store.saveMonthlyReview({ day, createdAt: todayKey(), note, ratings: defaultRatings })}>Сохранить отчёт</button></Card>
}

function FinalReport() {
  const store = useAppStore()
  const lastWeight = Object.values(store.dailyLogs).filter((l) => l.weight).at(-1)?.weight ?? '—'
  const stepLogs = Object.values(store.dailyLogs).filter((l) => l.steps)
  const avgSteps = stepLogs.length ? Math.round(stepLogs.reduce((s, l) => s + (l.steps ?? 0), 0) / stepLogs.length) : 0
  return <><PageTitle eyebrow="DAY 90" title="YOU MADE IT." description="Не идеальный streak. Девяносто дней данных, решений и продолжения." /><Card className="final-report"><div className="before-after"><span>BEFORE</span><TrendingUp /><span>AFTER</span></div><div className="final-grid"><div><span>BODY</span><strong>120 → {lastWeight} кг</strong></div><div><span>ACTIVITY</span><strong>2 000 → {avgSteps.toLocaleString('ru-RU')}</strong></div><div><span>GYM</span><strong>{store.workouts.filter((w) => w.completed).length} тренировок</strong></div><div><span>MIND</span><strong>{store.brainSessions.filter((s) => s.completed).length} сессий</strong></div></div></Card></>
}
