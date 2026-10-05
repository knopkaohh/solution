import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { AppData, DayStatus } from './types'
import { getMissions } from './program'

export const todayKey = () => format(new Date(), 'yyyy-MM-dd')
export const formatDate = (date: string, pattern = 'd MMMM') => format(parseISO(date), pattern, { locale: ru })

export function getProgramDay(start: string, date = todayKey()) {
  return Math.min(90, Math.max(1, differenceInCalendarDays(parseISO(date), parseISO(start)) + 1))
}

export function dateForDay(start: string, day: number) {
  const date = parseISO(start)
  date.setDate(date.getDate() + day - 1)
  return format(date, 'yyyy-MM-dd')
}

export function calculateDayScore(data: AppData, date: string) {
  const day = getProgramDay(data.settings.programStart, date)
  const missions = getMissions(day, date, data.settings)
  const daily = data.dailyLogs[date]
  const sleep = data.sleepLogs[date]
  const nutrition = data.nutritionLogs[date]
  const workout = data.workouts.some((item) => item.date === date && item.completed)
  const brain = data.brainSessions.some((item) => item.date === date && item.completed)
  const completed = daily?.completedTaskIds.length ?? 0
  const movementMission = missions.find((mission) => mission.id.endsWith('-movement'))
  const breakdown = {
    Сон: sleep?.durationMinutes && sleep?.quality ? 20 : sleep?.durationMinutes ? 10 : 0,
    Движение: Math.min(20, Math.round(((daily?.steps ?? 0) / Number(missions[0].title.replace(/\D/g, ''))) * 20) || 0),
    Тренировка: missions.some((m) => m.area === 'GYM') ? (workout ? 15 : 0) : movementMission && daily?.completedTaskIds.includes(movementMission.id) ? 15 : 0,
    Питание: nutrition?.meals ? 15 : 0,
    Мозг: brain ? 20 : 0,
    Дисциплина: Math.round((completed / missions.length) * 10),
  }
  return { score: Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)), breakdown }
}

export function getDayStatus(data: AppData, date: string): DayStatus {
  if (date > todayKey()) return 'future'
  const { score } = calculateDayScore(data, date)
  if (score >= 70) return 'good'
  if (score > 0) return 'partial'
  return date === todayKey() ? 'partial' : 'missed'
}

export function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return undefined
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 1440
  return minutes
}

export const formatDuration = (minutes?: number) =>
  minutes ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : '—'

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}
