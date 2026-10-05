import { describe, expect, it } from 'vitest'
import { createInitialData, migrateV1ToV2, parseAndMigrateData } from '../src/data'
import { createDailyPlan, createPlanRevision } from '../src/program'
import { calculateScores, evaluateAction } from '../src/scoring'
import type { AppData, Settings } from '../src/types'
import { calculateWeightAverage, getProgramPosition } from '../src/utils'

const settings: Settings = {
  name: 'Антон', programStart: '2026-01-10', wakeTarget: '08:00', sleepTarget: '00:00',
  workoutDays: [2, 6], baseStepGoal: 3000, brainMinutes: 20, units: 'metric',
  theme: 'dark', nutritionMode: 'simple', notifications: false,
}

function fixture(date = '2026-01-19') {
  const data = createInitialData(settings)
  data.cycle = { ...data.cycle, id: 'cycle-1', startDate: settings.programStart, createdAt: '2026-01-10T00:00:00.000Z' }
  const position = getProgramPosition(data.cycle.startDate, date)
  const plan = createDailyPlan({ cycle: data.cycle, date, programDay: position.day, settings, workouts: [], now: `${date}T06:00:00.000Z` })
  data.dailyPlans[date] = plan
  return { data, plan }
}

describe('program dates', () => {
  it('distinguishes before, active boundaries, and completed', () => {
    expect(getProgramPosition('2026-01-10', '2026-01-09')).toMatchObject({ status: 'BEFORE', day: 0 })
    expect(getProgramPosition('2026-01-10', '2026-01-10')).toMatchObject({ status: 'ACTIVE', day: 1 })
    expect(getProgramPosition('2026-01-10', '2026-04-09')).toMatchObject({ status: 'ACTIVE', day: 90 })
    expect(getProgramPosition('2026-01-10', '2026-04-10')).toMatchObject({ status: 'COMPLETED', day: 90 })
  })
})

describe('daily plan snapshots', () => {
  it('captures targets and does not change when settings change', () => {
    const { data, plan } = fixture()
    const originalTarget = plan.targetsSnapshot.stepsFull
    const changedSettings = { ...data.settings, baseStepGoal: 5000, brainMinutes: 30 }
    createDailyPlan({ cycle: data.cycle, date: '2026-01-20', programDay: 11, settings: changedSettings, workouts: [] })
    expect(plan.targetsSnapshot.stepsFull).toBe(originalTarget)
    expect(plan.targetsSnapshot.brainMinutesFull).toBe(20)
    expect(plan.originalPlan.targets).toEqual(plan.targetsSnapshot)
  })

  it('creates a revision without changing the original plan', () => {
    const { plan } = fixture()
    const original = structuredClone(plan.originalPlan)
    const revision = createPlanRevision(plan, 'minimum', 'Усталость', 1)
    expect(revision.mode).toBe('minimum')
    expect(revision.plannedActions.find((action) => action.type === 'brain-session')?.label).toContain('5')
    expect(plan.originalPlan).toEqual(original)
  })
})

describe('action evaluation and scores', () => {
  it('keeps missing facts UNVERIFIED', () => {
    const { data, plan } = fixture()
    const steps = plan.plannedActions.find((action) => action.type === 'steps')!
    expect(evaluateAction(steps, plan, data).status).toBe('UNVERIFIED')
    expect(calculateScores(data, plan).executionScore).toBeUndefined()
  })

  it('accepts a manual completion mark for any planned action', () => {
    const { data, plan } = fixture()
    const steps = plan.plannedActions.find((action) => action.type === 'steps')!
    data.dailyLogs[plan.date] = {
      date: plan.date, manualActionIds: [steps.id], updatedAt: new Date().toISOString(),
    }
    expect(evaluateAction(steps, plan, data)).toMatchObject({
      status: 'FULL',
      credit: 1,
      explanation: 'Выполнение подтверждено вручную',
    })
  })

  it('marks a numeric result below full as PARTIAL', () => {
    const { data, plan } = fixture()
    data.dailyLogs[plan.date] = { date: plan.date, steps: 2800, manualActionIds: [], updatedAt: new Date().toISOString() }
    const steps = plan.plannedActions.find((action) => action.type === 'steps')!
    const result = evaluateAction(steps, plan, data)
    expect(result.status).toBe('PARTIAL')
    expect(result.credit).toBeGreaterThan(0)
    expect(result.credit).toBeLessThan(0.6)
  })

  it('gives MINIMUM credit only in minimum mode', () => {
    const { data, plan } = fixture()
    plan.mode = 'minimum'
    data.dailyLogs[plan.date] = { date: plan.date, steps: plan.targetsSnapshot.stepsMinimum, manualActionIds: [], updatedAt: new Date().toISOString() }
    const steps = plan.plannedActions.find((action) => action.type === 'steps')!
    expect(evaluateAction(steps, plan, data)).toMatchObject({ status: 'MINIMUM', credit: 0.6 })
  })

  it('classifies a completed reduced plan as MINIMUM rather than FULL', () => {
    const { data, plan } = fixture()
    plan.mode = 'minimum'
    data.dailyLogs[plan.date] = { date: plan.date, steps: plan.targetsSnapshot.stepsMinimum, manualActionIds: [], updatedAt: new Date().toISOString() }
    data.sleepLogs[plan.date] = {
      id: 'sleep-min', date: plan.date, sleepOnset: '01:00', wakeTime: '09:00', quality: 5,
      durationMinutes: 480, targetSleepTime: '00:00', targetWakeTime: '08:00', source: 'manual', updatedAt: new Date().toISOString(),
    }
    data.nutritionLogs[plan.date] = {
      id: 'food-min', date: plan.date, quality: 'average', fluidMl: 1500, items: [], updatedAt: new Date().toISOString(),
    }
    data.brainSessions.push({
      id: 'brain-min', date: plan.date, category: 'FOCUS', task: 'Focus', difficulty: 1,
      plannedDuration: 5, actualDuration: 5, completed: true,
    })
    expect(calculateScores(data, plan).dayStatus).toBe('MINIMUM')
  })

  it('separates execution from day score', () => {
    const { data, plan } = fixture()
    data.dailyLogs[plan.date] = { date: plan.date, steps: plan.targetsSnapshot.stepsFull, manualActionIds: [], updatedAt: new Date().toISOString(), closedAt: new Date().toISOString() }
    const before = calculateScores(data, plan)
    data.dailyLogs[plan.date].manualActionIds.push(`${plan.date}-sleep-prep`)
    const after = calculateScores(data, plan)
    expect(before.executionScore).toBe(67)
    expect(after.executionScore).toBe(100)
    expect(after.executionScore).toBeGreaterThan(before.executionScore ?? 0)
    expect(after.dayScore).toBe(before.dayScore)
  })

  it('labels a recovery plan separately', () => {
    const { data, plan } = fixture()
    const revision = createPlanRevision(plan, 'recovery', 'Болезнь', 1)
    plan.mode = 'recovery'
    plan.plannedActions = revision.plannedActions
    data.sleepLogs[plan.date] = {
      id: 'sleep', date: plan.date, sleepOnset: '01:00', wakeTime: '09:00', durationMinutes: 480,
      quality: 5, targetSleepTime: '00:00', targetWakeTime: '08:00', source: 'manual', updatedAt: new Date().toISOString(),
    }
    const result = calculateScores(data, plan)
    expect(result.dayStatus).toBe('RECOVERY')
    expect(result.actionEvaluations[`${plan.date}-sleep`].status).toBe('RECOVERY_ACTION_FULL')
  })
})

describe('weight trend and free-form workouts', () => {
  it('requires three measurements for a seven-day average', () => {
    const two = [
      { id: '1', timestamp: '2026-01-18T08:00:00', value: 120, unit: 'kg' as const, source: 'manual' as const, confirmed: true, suspicious: false },
      { id: '2', timestamp: '2026-01-19T08:00:00', value: 119, unit: 'kg' as const, source: 'manual' as const, confirmed: true, suspicious: false },
    ]
    expect(calculateWeightAverage(two, '2026-01-19').sufficient).toBe(false)
    expect(calculateWeightAverage([...two, { ...two[0], id: '3', timestamp: '2026-01-17T08:00:00', value: 118 }], '2026-01-19')).toMatchObject({ sufficient: true, average: 119 })
  })

  it('accepts a completed custom workout as factual evidence', () => {
    const { data, plan } = fixture('2026-01-20')
    const action = plan.plannedActions.find((item) => item.type === 'workout')!
    data.workouts.push({
      id: 'custom-workout', date: plan.date, template: 'CUSTOM', durationMinutes: 45,
      completed: true, shortened: false, recoveryMode: false, notes: 'Самостоятельная тренировка', sets: [],
    })
    expect(action).toBeDefined()
    expect(evaluateAction(action, plan, data)).toMatchObject({ status: 'FULL', credit: 1 })
  })
})

describe('data migrations', () => {
  it('migrates v1 weight and sleep data', () => {
    const migrated = migrateV1ToV2({
      version: 1, settings,
      dailyLogs: { '2026-01-10': { date: '2026-01-10', weight: 120, steps: 3000 } },
      sleepLogs: { '2026-01-10': { date: '2026-01-10', fellAsleep: '01:00', wokeUp: '09:00', quality: 5 } },
    })
    expect(migrated.dataVersion).toBe(2)
    expect(migrated.weightMeasurements[0].value).toBe(120)
    expect(migrated.sleepLogs['2026-01-10']).toMatchObject({ sleepOnset: '01:00', durationMinutes: 480 })
    expect(migrated.dailyPlans['2026-01-10']).toBeDefined()
  })

  it('rejects corrupted imports without returning partial data', () => {
    expect(() => parseAndMigrateData({ dataVersion: 2, settings: {} })).toThrow()
    expect(() => parseAndMigrateData({ dataVersion: 99 })).toThrow()
  })

  it('accepts a complete v2 export', () => {
    const data: AppData = fixture().data
    expect(parseAndMigrateData(data).dataVersion).toBe(2)
  })
})
