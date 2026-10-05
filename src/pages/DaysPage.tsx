import { useMemo, useState } from 'react'
import { Card, PageTitle } from '../components'
import { getPhase } from '../program'
import { useAppStore } from '../store'
import { calculateDayScore, dateForDay, formatDate, getDayStatus, getProgramDay } from '../utils'

const statusLabels = { good: 'Выполнено', partial: 'Частично', missed: 'Пропущено', future: 'Впереди' }

export function DaysPage() {
  const store = useAppStore()
  const currentDay = getProgramDay(store.settings.programStart)
  const [selected, setSelected] = useState(currentDay)
  const days = useMemo(() => Array.from({ length: 90 }, (_, index) => {
    const day = index + 1
    const date = dateForDay(store.settings.programStart, day)
    return { day, date, status: getDayStatus(store, date), score: calculateDayScore(store, date).score }
  }), [store])
  const selectedDay = days[selected - 1]
  const phase = getPhase(selected)

  return (
    <>
      <PageTitle eyebrow="90 DAYS" title="Не streak. Система." description="Каждый день — отдельная возможность. Пропуск не стирает уже сделанное." />
      <div className="phase-strip">
        {([1, 2, 3] as const).map((id) => {
          const item = getPhase(id === 1 ? 1 : id === 2 ? 31 : 61)
          return <div key={id} className={currentDay >= item.range[0] && currentDay <= item.range[1] ? 'active' : ''}><span>PHASE {id}</span><strong>{item.name}</strong><small>Дни {item.range[0]}–{item.range[1]}</small></div>
        })}
      </div>
      <div className="calendar-layout">
        <Card className="calendar-card">
          <div className="legend"><span><i className="good" />Выполнено</span><span><i className="partial" />Частично</span><span><i className="missed" />Пропущено</span><span><i className="future" />Впереди</span></div>
          <div className="days-grid">
            {days.map((item) => (
              <button key={item.day} className={`day-cell ${item.status} ${selected === item.day ? 'selected' : ''}`} onClick={() => setSelected(item.day)}>
                <small>DAY</small><strong>{item.day}</strong>{item.status !== 'future' && <em>{item.score}</em>}
              </button>
            ))}
          </div>
        </Card>
        <Card className="day-inspector">
          <span className="eyebrow">ДЕНЬ {selected} / 90</span>
          <h2>{formatDate(selectedDay.date)}</h2>
          <span className={`status-badge ${selectedDay.status}`}>{statusLabels[selectedDay.status]}</span>
          <div className="big-stat"><strong>{selectedDay.score}</strong><span>/ 100<br />DAY SCORE</span></div>
          <hr />
          <small>PHASE {phase.id} · {phase.name}</small>
          <p>{phase.description}</p>
          {selectedDay.status === 'missed' && <div className="soft-note">Этот день остался позади. Ничего наверстывать не нужно — продолжай с текущего дня.</div>}
          {selectedDay.status === 'future' && <div className="soft-note">План сформируется автоматически, когда наступит этот день.</div>}
        </Card>
      </div>
    </>
  )
}
