import type { ActionDomain, ActionStatus, DayMode, DayStatus, ProgramPhase } from './types'

export const phaseLabel: Record<ProgramPhase, string> = {
  RESET: 'ПЕРЕЗАГРУЗКА',
  BUILD: 'РАЗВИТИЕ',
  'LEVEL UP': 'ЗАКРЕПЛЕНИЕ',
}

export const modeLabel: Record<DayMode, string> = {
  normal: 'Обычный день',
  minimum: 'Минимальный день',
  recovery: 'Восстановление',
}

export const actionStatusLabel: Record<ActionStatus, string> = {
  FULL: 'Выполнено',
  MINIMUM: 'Минимум',
  PARTIAL: 'Частично',
  MISSED: 'Не выполнено',
  NOT_APPLICABLE: 'Не требуется',
  UNVERIFIED: 'Нет данных',
  RECOVERY_ACTION_FULL: 'Восстановление',
}

export const dayStatusLabel: Record<DayStatus, string> = {
  FULL: 'Выполнено',
  MINIMUM: 'Минимальный день',
  PARTIAL: 'Частично',
  MISSED: 'Не выполнено',
  RECOVERY: 'Восстановление',
  UNVERIFIED: 'Нет данных',
  FUTURE: 'Впереди',
}

export const domainLabel: Record<ActionDomain, string> = {
  SLEEP: 'Сон',
  MOVEMENT: 'Движение',
  TRAINING: 'Тренировка',
  NUTRITION: 'Питание',
  MIND: 'Мышление',
}
