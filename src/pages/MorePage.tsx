import { CalendarDays, ChartNoAxesCombined, ChevronRight, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageTitle } from '../components'

const links = [
  { to: '/days', title: '90 дней', detail: 'Календарь цикла и история дней', icon: CalendarDays },
  { to: '/progress', title: 'Прогресс', detail: 'Тренды и недельный обзор', icon: ChartNoAxesCombined },
  { to: '/settings', title: 'Настройки', detail: 'Цели, интерфейс и резервная копия', icon: Settings },
]

export function MorePage() {
  return (
    <>
      <PageTitle eyebrow="ДОПОЛНИТЕЛЬНО" title="Ещё" description="История, прогресс и настройки приложения." />
      <Card className="more-links">
        {links.map(({ to, title, detail, icon: Icon }) => (
          <Link key={to} to={to}>
            <Icon />
            <span><strong>{title}</strong><small>{detail}</small></span>
            <ChevronRight />
          </Link>
        ))}
      </Card>
    </>
  )
}
