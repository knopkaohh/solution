import { useState } from 'react'
import { Card, PageTitle } from '../components'
import { getPhase } from '../program'
import { calculateScores } from '../scoring'
import { useAppStore } from '../store'
import type { DayStatus, ProgramPhase } from '../types'
import { dateForDay, formatDate, getProgramPosition, todayKey } from '../utils'
import { dayStatusLabel, modeLabel, phaseLabel } from '../localization'

export function DaysPage() {
  const store = useAppStore()
  const position = getProgramPosition(store.cycle.startDate)
  const currentDay = position.day || 1
  const [selected, setSelected] = useState(currentDay)
  const days = Array.from({ length: 90 }, (_, index) => {
    const day = index + 1
    const date = dateForDay(store.cycle.startDate, day)
    const plan = store.dailyPlans[date]
    if (date > todayKey()) return { day, date, status: 'FUTURE' as DayStatus, plan, score: undefined }
    if (!plan) return { day, date, status: 'UNVERIFIED' as DayStatus, plan, score: undefined }
    const result = calculateScores(store, plan)
    return { day, date, status: result.dayStatus, plan, score: result.dayScore }
  })
  const selectedDay = days[selected - 1]
  const phase = getPhase(selected)

  return (
    <>
      <PageTitle eyebrow="90 ДНЕЙ" title="История не переписывается." description="Каждый день хранит собственный план. Текущие настройки не изменяют прошлые цели." />
      <div className="phase-strip">
        {([1, 2, 3] as const).map((id) => {
          const item = getPhase(id === 1 ? 1 : id === 2 ? 31 : 61)
          return <div key={id} className={currentDay >= item.range[0] && currentDay <= item.range[1] ? 'active' : ''}><span>ЭТАП {id}</span><strong>{phaseLabel[item.name as ProgramPhase]}</strong><small>Дни {item.range[0]}–{item.range[1]}</small></div>
        })}
      </div>
      <div className="calendar-layout">
        <Card className="calendar-card">
          <div className="legend"><span><i className="good" />Выполнено</span><span><i className="partial" />Частично или минимум</span><span><i className="missed" />Не выполнено</span><span><i className="future" />Впереди или нет данных</span></div>
          <div className="days-grid">
            {days.map((item) => <button key={item.day} className={`day-cell ${item.status.toLowerCase()} ${selected === item.day ? 'selected' : ''}`} onClick={() => setSelected(item.day)}>
              <small>ДЕНЬ</small><strong>{item.day}</strong>{item.score !== undefined && <em>{item.score}</em>}
            </button>)}
          </div>
        </Card>
        <Card className="day-inspector">
          <span className="eyebrow">ДЕНЬ {selected} / 90</span><h2>{formatDate(selectedDay.date)}</h2>
          <span className={`status-badge ${selectedDay.status.toLowerCase()}`}>{dayStatusLabel[selectedDay.status]}</span>
          <div className="big-stat"><strong>{selectedDay.score ?? '—'}</strong><span>/ 100<br />ОЦЕНКА ДНЯ</span></div>
          <hr /><small>ЭТАП {phase.id} · {phaseLabel[phase.name as ProgramPhase]}</small>
          {selectedDay.plan ? <>
            <p>План создан {formatDate(selectedDay.plan.createdAt.slice(0, 10))}.</p>
            <div className="snapshot-list"><span>Шаги <b>{selectedDay.plan.targetsSnapshot.stepsFull.toLocaleString('ru-RU')}</b></span><span>Мышление <b>{selectedDay.plan.targetsSnapshot.brainMinutesFull} мин</b></span><span>Режим <b>{modeLabel[selectedDay.plan.mode]}</b></span></div>
          </> : <div className="soft-note">{selectedDay.status === 'FUTURE' ? 'План будет создан при первом открытии этого дня.' : 'День не считается пропущенным: фактических данных недостаточно.'}</div>}
        </Card>
      </div>
    </>
  )
}
