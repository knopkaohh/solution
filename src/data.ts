import { format } from 'date-fns'
import { z } from 'zod'
import { createDailyPlan } from './program'
import type {
  AppData, BrainCategory, BrainSession, NutritionLog, Settings, SleepLog,
  WorkoutSession,
} from './types'
import { DATA_VERSION, METHODOLOGY_VERSION } from './types'
import { getProgramPosition, minutesBetween, uid } from './utils'

export const defaultSettings = (): Settings => ({
  name: 'Антон',
  programStart: format(new Date(), 'yyyy-MM-dd'),
  wakeTarget: '08:00',
  sleepTarget: '00:00',
  workoutDays: [2, 6],
  baseStepGoal: 3000,
  brainMinutes: 20,
  units: 'metric',
  theme: 'dark',
  nutritionMode: 'simple',
  notifications: false,
})

export function createInitialData(settings = defaultSettings()): AppData {
  const now = new Date().toISOString()
  return {
    dataVersion: DATA_VERSION,
    settings,
    cycle: { id: uid(), startDate: settings.programStart, methodologyVersion: METHODOLOGY_VERSION, createdAt: now },
    dailyPlans: {},
    planRevisions: {},
    dailyLogs: {},
    sleepLogs: {},
    nutritionLogs: {},
    weightMeasurements: [],
    workouts: [],
    brainSessions: [],
    scoreSnapshots: {},
    weeklyReviews: [],
    monthlyReviews: [],
  }
}

const settingsSchema = z.object({
  name: z.string(),
  programStart: z.string(),
  wakeTarget: z.string(),
  sleepTarget: z.string(),
  workoutDays: z.array(z.number()),
  baseStepGoal: z.number(),
  brainMinutes: z.number(),
  units: z.enum(['metric', 'imperial']),
  theme: z.enum(['dark', 'light', 'system']),
  nutritionMode: z.enum(['simple', 'advanced']),
  notifications: z.boolean(),
})

const v2Schema = z.object({
  dataVersion: z.literal(DATA_VERSION),
  settings: settingsSchema,
  cycle: z.object({
    id: z.string(), startDate: z.string(), methodologyVersion: z.string(), createdAt: z.string(),
  }),
  dailyPlans: z.record(z.string(), z.object({
    id: z.string(), cycleId: z.string(), date: z.string(), programDay: z.number(),
    phase: z.enum(['RESET', 'BUILD', 'LEVEL UP']), createdAt: z.string(), methodologyVersion: z.string(),
    adaptiveStateSnapshot: z.object({
      stepLevel: z.number(), brainMinutes: z.number(), workoutVolume: z.enum(['intro', 'standard']), capturedAt: z.string(),
    }),
    targetsSnapshot: z.record(z.string(), z.unknown()),
    plannedActions: z.array(z.record(z.string(), z.unknown())),
    originalPlan: z.record(z.string(), z.unknown()),
    currentRevisionId: z.string(),
    mode: z.enum(['normal', 'minimum', 'recovery']),
  }).passthrough()),
  planRevisions: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  dailyLogs: z.record(z.string(), z.record(z.string(), z.unknown())),
  sleepLogs: z.record(z.string(), z.record(z.string(), z.unknown())),
  nutritionLogs: z.record(z.string(), z.record(z.string(), z.unknown())),
  weightMeasurements: z.array(z.record(z.string(), z.unknown())),
  workouts: z.array(z.record(z.string(), z.unknown())),
  brainSessions: z.array(z.record(z.string(), z.unknown())),
  scoreSnapshots: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  weeklyReviews: z.array(z.record(z.string(), z.unknown())),
  monthlyReviews: z.array(z.record(z.string(), z.unknown())),
})

type LegacyData = {
  version?: number
  settings?: Settings
  dailyLogs?: Record<string, { date: string; weight?: number; steps?: number; mood?: number; note?: string; completedTaskIds?: string[] }>
  sleepLogs?: Record<string, { date: string; wentToBed?: string; fellAsleep?: string; wokeUp?: string; gotUp?: string; durationMinutes?: number; quality?: number; awakenings?: number; napMinutes?: number }>
  nutritionLogs?: Record<string, { date: string; meals?: number; sweets?: boolean; coffee?: number; water?: number; rating?: number; items?: NutritionLog['items'] }>
  workouts?: Array<{ id: string; date: string; template: 'A' | 'B' | 'MINIMUM'; duration?: number; completed?: boolean; exercises?: Array<{ name: string; done: boolean; sets: Array<{ weight?: number; reps?: number }> }>; note?: string }>
  brainSessions?: Array<{ id: string; date: string; category: BrainCategory; minutes?: number; completed?: boolean; score?: number }>
  weeklyReviews?: AppData['weeklyReviews']
  monthlyReviews?: AppData['monthlyReviews']
}

export function migrateV1ToV2(legacy: LegacyData): AppData {
  const settings = { ...defaultSettings(), ...legacy.settings }
  const data = createInitialData(settings)
  const now = new Date().toISOString()

  Object.values(legacy.dailyLogs ?? {}).forEach((log) => {
    data.dailyLogs[log.date] = {
      date: log.date, steps: log.steps, note: log.note, manualActionIds: [],
      updatedAt: now,
    }
    if (log.weight && log.weight > 0) {
      data.weightMeasurements.push({
        id: uid(), timestamp: `${log.date}T08:00:00`, value: log.weight, unit: 'kg',
        source: 'manual', confirmed: true, suspicious: false,
      })
    }
  })
  Object.values(legacy.sleepLogs ?? {}).forEach((log) => {
    const migrated: SleepLog = {
      id: uid(), date: log.date, bedtime: log.wentToBed, sleepOnset: log.fellAsleep,
      wakeTime: log.wokeUp, getUpTime: log.gotUp,
      durationMinutes: log.durationMinutes ?? minutesBetween(log.fellAsleep, log.wokeUp),
      quality: log.quality, awakenings: log.awakenings, napMinutes: log.napMinutes,
      targetSleepTime: settings.sleepTarget, targetWakeTime: settings.wakeTarget,
      source: 'manual', updatedAt: now,
    }
    data.sleepLogs[log.date] = migrated
  })
  Object.values(legacy.nutritionLogs ?? {}).forEach((log) => {
    data.nutritionLogs[log.date] = {
      id: uid(), date: log.date, meals: log.meals, sweets: log.sweets, coffee: log.coffee,
      water: log.water, rating: log.rating, items: log.items ?? [], updatedAt: now,
    }
  })
  data.workouts = (legacy.workouts ?? []).filter((workout) => workout.template !== 'MINIMUM').map((workout): WorkoutSession => ({
    id: workout.id, date: workout.date, template: workout.template as 'A' | 'B',
    durationMinutes: workout.duration ?? 0, completed: workout.completed ?? false,
    shortened: false, recoveryMode: false, notes: workout.note,
    sets: (workout.exercises ?? []).flatMap((exercise) =>
      (exercise.sets.length ? exercise.sets : [{}]).map((set, index) => ({
        id: uid(), exerciseId: exercise.name.toLowerCase().replace(/\s+/g, '-'), exerciseName: exercise.name,
        setNumber: index + 1, weight: set.weight, reps: set.reps, completed: exercise.done,
        kind: ['Разминка', 'Заминка'].includes(exercise.name) ? 'warmup' : 'work',
      })),
    ),
  }))
  data.brainSessions = (legacy.brainSessions ?? []).map((session): BrainSession => ({
    id: session.id, date: session.date, category: session.category, task: 'Перенесённое занятие',
    difficulty: 1, plannedDuration: settings.brainMinutes, actualDuration: session.minutes ?? 0,
    completed: session.completed ?? false, result: session.score === undefined ? undefined : String(session.score),
  }))
  data.weeklyReviews = legacy.weeklyReviews ?? []
  data.monthlyReviews = legacy.monthlyReviews ?? []

  const dates = new Set([
    ...Object.keys(data.dailyLogs), ...Object.keys(data.sleepLogs), ...Object.keys(data.nutritionLogs),
    ...data.workouts.map((item) => item.date), ...data.brainSessions.map((item) => item.date),
  ])
  dates.forEach((date) => {
    const position = getProgramPosition(settings.programStart, date)
    if (position.status === 'ACTIVE') {
      data.dailyPlans[date] = createDailyPlan({ cycle: data.cycle, date, programDay: position.day, settings, workouts: data.workouts, now })
    }
  })
  return data
}

export function parseAndMigrateData(input: unknown): AppData {
  if (!input || typeof input !== 'object') throw new Error('Файл не содержит данных PERSONAL 90')
  const candidate = input as Record<string, unknown>
  if (candidate.dataVersion === DATA_VERSION) {
    const parsed = v2Schema.safeParse(candidate)
    if (!parsed.success) throw new Error(`Некорректная схема версии 2: ${parsed.error.issues[0]?.message ?? 'неизвестная ошибка'}`)
    return candidate as unknown as AppData
  }
  if (candidate.version === 1 || (!candidate.dataVersion && candidate.settings && candidate.dailyLogs)) {
    return migrateV1ToV2(candidate as LegacyData)
  }
  throw new Error('Неподдерживаемая версия данных')
}
