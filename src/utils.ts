import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ProgramStatus, WeightMeasurement } from './types'

export const todayKey = () => format(new Date(), 'yyyy-MM-dd')
export const formatDate = (date: string, pattern = 'd MMMM') => format(parseISO(date), pattern, { locale: ru })

export interface ProgramPosition {
  status: ProgramStatus
  day: number
  rawDay: number
}

export function getProgramPosition(start: string, date = todayKey()): ProgramPosition {
  const rawDay = differenceInCalendarDays(parseISO(date), parseISO(start)) + 1
  if (rawDay < 1) return { status: 'BEFORE', day: 0, rawDay }
  if (rawDay > 90) return { status: 'COMPLETED', day: 90, rawDay }
  return { status: 'ACTIVE', day: rawDay, rawDay }
}

export function getProgramDay(start: string, date = todayKey()) {
  return getProgramPosition(start, date).day
}

export function dateForDay(start: string, day: number) {
  const date = parseISO(start)
  date.setDate(date.getDate() + day - 1)
  return format(date, 'yyyy-MM-dd')
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

export function circularMinuteDistance(a?: string, b?: string) {
  if (!a || !b) return undefined
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const distance = Math.abs(toMinutes(a) - toMinutes(b))
  return Math.min(distance, 1440 - distance)
}

export function calculateWeightAverage(measurements: WeightMeasurement[], endDate: string) {
  const end = parseISO(endDate)
  const eligible = measurements.filter((measurement) => {
    const date = parseISO(measurement.timestamp)
    const difference = differenceInCalendarDays(end, date)
    return difference >= 0 && difference <= 6 && measurement.value > 0
  })
  if (eligible.length < 3) return { average: undefined, count: eligible.length, sufficient: false }
  const average = eligible.reduce((sum, measurement) => sum + measurement.value, 0) / eligible.length
  return { average: Math.round(average * 10) / 10, count: eligible.length, sufficient: true }
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}
