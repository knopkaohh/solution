import type {
  ActionEvaluation, AppData, DailyPlanSnapshot, DayStatus, DomainScores,
  PlannedAction, ScoreSnapshot, SleepLog,
} from './types'
import { circularMinuteDistance, minutesBetween, uid } from './utils'

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function evaluation(status: ActionEvaluation['status'], credit: number, explanation: string, actual?: ActionEvaluation['actual'], target?: ActionEvaluation['target'], evidenceIds: string[] = []): ActionEvaluation {
  return { status, credit: clamp(credit, 0, 1), actual, target, evidenceIds, explanation, evaluatedAt: new Date().toISOString() }
}

function numericEvaluation(action: PlannedAction, actual: number | undefined, mode: DailyPlanSnapshot['mode'], evidenceIds: string[]) {
  if (actual === undefined) return evaluation('UNVERIFIED', 0, 'Фактическое значение пока не внесено', undefined, action.fullTarget)
  const full = action.fullTarget ?? 0
  const minimum = action.minimumTarget ?? 0
  if (full > 0 && actual >= full) return evaluation('FULL', 1, `Цель выполнена: ${actual} из ${full}`, actual, full, evidenceIds)
  if (mode === 'minimum' && minimum > 0 && actual >= minimum) {
    return evaluation('MINIMUM', 0.6, `Минимальная версия выполнена: ${actual} из ${minimum}`, actual, minimum, evidenceIds)
  }
  if (actual > 0) {
    const reference = minimum > 0 ? minimum : full
    const credit = reference > 0 ? Math.min(0.59, 0.6 * actual / reference) : 0.3
    return evaluation('PARTIAL', credit, `Выполнено частично: ${actual}`, actual, full, evidenceIds)
  }
  return evaluation('MISSED', 0, 'Фактическое значение внесено: выполнения нет', actual, full, evidenceIds)
}

export function evaluateAction(action: PlannedAction, plan: DailyPlanSnapshot, data: AppData): ActionEvaluation {
  if (!action.applicable) return evaluation('NOT_APPLICABLE', 0, 'Действие не применяется в текущем режиме')
  const daily = data.dailyLogs[plan.date]
  if (daily?.manualActionIds.includes(action.id)) {
    return evaluation('FULL', 1, 'Выполнение подтверждено вручную', true, action.fullTarget, [daily.date])
  }
  const sleep = data.sleepLogs[plan.date]
  const nutrition = data.nutritionLogs[plan.date]
  const workout = data.workouts.find((item) => item.date === plan.date)
  const brain = data.brainSessions.find((item) => item.date === plan.date)

  if (action.evidenceType === 'STEPS') {
    if (plan.mode === 'minimum' && (daily?.movementMinutes ?? 0) >= plan.targetsSnapshot.movementMinutesMinimum) {
      return evaluation('MINIMUM', 0.6, `${daily?.movementMinutes} минут спокойного движения`, daily?.movementMinutes, plan.targetsSnapshot.movementMinutesMinimum, [plan.date])
    }
    return numericEvaluation(action, daily?.steps, plan.mode, daily ? [daily.date] : [])
  }
  if (action.evidenceType === 'SLEEP_LOG') {
    if (!sleep) return evaluation('UNVERIFIED', 0, 'Сон пока не записан')
    const complete = Boolean(sleep.sleepOnset && sleep.wakeTime && sleep.quality)
    const fields = [sleep.sleepOnset, sleep.wakeTime, sleep.quality].filter((value) => value !== undefined).length
    if (complete) {
      const status = plan.mode === 'recovery' ? 'RECOVERY_ACTION_FULL' : plan.mode === 'minimum' ? 'MINIMUM' : 'FULL'
      return evaluation(status, plan.mode === 'minimum' ? 0.6 : 1, 'Время сна, подъёма и качество записаны', fields, 3, [sleep.id])
    }
    return evaluation('PARTIAL', 0.59 * fields / 3, `Заполнено ${fields} из 3 основных полей`, fields, 3, [sleep.id])
  }
  if (action.evidenceType === 'NUTRITION_LOG') {
    if (!nutrition) return evaluation('UNVERIFIED', 0, 'Питание пока не записано')
    const values = [nutrition.quality, nutrition.fluidMl]
    const fields = values.filter((value) => value !== undefined).length
    if (fields === 2) {
      return evaluation(plan.mode === 'minimum' ? 'MINIMUM' : 'FULL', plan.mode === 'minimum' ? 0.6 : 1, 'Оценка питания и жидкость записаны', fields, 2, [nutrition.id])
    }
    return evaluation('PARTIAL', 0.59 * fields / 2, `Заполнено ${fields} из 2 основных полей`, fields, 2, [nutrition.id])
  }
  if (action.evidenceType === 'WORKOUT') {
    if (!workout) return evaluation('UNVERIFIED', 0, 'Тренировка пока не записана')
    if (workout.completed && !workout.shortened) {
      return evaluation('FULL', 1, 'Тренировка записана', workout.durationMinutes, undefined, [workout.id])
    }
    if (plan.mode === 'minimum' && (workout.completed || workout.shortened) && workout.durationMinutes >= (action.minimumTarget ?? 15)) {
      return evaluation('MINIMUM', 0.6, 'Сокращённая тренировка выполнена', workout.durationMinutes, action.minimumTarget, [workout.id])
    }
    return evaluation('PARTIAL', workout.durationMinutes > 0 ? 0.4 : 0, 'Тренировка выполнена частично', workout.durationMinutes, undefined, [workout.id])
  }
  if (action.evidenceType === 'BRAIN') {
    if (!brain) return evaluation('UNVERIFIED', 0, 'Занятие для мышления пока не записано')
    if (brain.completed && brain.actualDuration >= (action.fullTarget ?? brain.plannedDuration)) {
      return evaluation('FULL', 1, `${brain.actualDuration} минут выполнено`, brain.actualDuration, action.fullTarget, [brain.id])
    }
    if (plan.mode === 'minimum' && brain.completed && brain.actualDuration >= (action.minimumTarget ?? 5)) {
      return evaluation('MINIMUM', 0.6, 'Минимальное занятие для мышления выполнено', brain.actualDuration, action.minimumTarget, [brain.id])
    }
    return numericEvaluation(action, brain.actualDuration, plan.mode, [brain.id])
  }
  if (action.evidenceType === 'MANUAL') {
    const done = daily?.manualActionIds.includes(action.id)
    if (done) return evaluation('FULL', 1, 'Подтверждено пользователем', true, true, [daily?.date ?? plan.date])
    if (daily?.closedAt) return evaluation('MISSED', 0, 'Действие не было отмечено', false, true)
    return evaluation('UNVERIFIED', 0, 'Ожидает ручного подтверждения')
  }
  return evaluation('UNVERIFIED', 0, 'Нет подходящего источника данных')
}

function averagePairwiseDeviation(values: string[]) {
  if (values.length < 2) return undefined
  const distances: number[] = []
  values.forEach((value, index) => values.slice(index + 1).forEach((other) => distances.push(circularMinuteDistance(value, other) ?? 0)))
  return distances.reduce((sum, value) => sum + value, 0) / distances.length
}

function sleepScore(log: SleepLog | undefined, allLogs: SleepLog[]) {
  if (!log) return undefined
  const parts: { score: number; weight: number }[] = []
  if (log.durationMinutes !== undefined) {
    const targetDuration = minutesBetween(log.targetSleepTime, log.targetWakeTime) ?? 480
    parts.push({ score: clamp(100 - Math.abs(log.durationMinutes - targetDuration) / 120 * 100), weight: 40 })
  }
  if (log.sleepOnset && log.wakeTime) {
    const onsetDistance = circularMinuteDistance(log.sleepOnset, log.targetSleepTime) ?? 120
    const wakeDistance = circularMinuteDistance(log.wakeTime, log.targetWakeTime) ?? 120
    const averageDistance = (onsetDistance + wakeDistance) / 2
    parts.push({ score: clamp(100 - Math.max(0, averageDistance - 15) / 105 * 100), weight: 20 })
  }
  if (log.quality !== undefined) parts.push({ score: clamp((log.quality - 1) / 9 * 100), weight: 25 })
  const recent = allLogs.filter((item) => item.date <= log.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  if (recent.length >= 4) {
    const onsetDeviation = averagePairwiseDeviation(recent.flatMap((item) => item.sleepOnset ? [item.sleepOnset] : []))
    const wakeDeviation = averagePairwiseDeviation(recent.flatMap((item) => item.wakeTime ? [item.wakeTime] : []))
    if (onsetDeviation !== undefined && wakeDeviation !== undefined) {
      const deviation = (onsetDeviation + wakeDeviation) / 2
      parts.push({ score: clamp(100 - Math.max(0, deviation - 15) / 75 * 100), weight: 15 })
    }
  }
  if (!parts.length) return undefined
  return Math.round(parts.reduce((sum, part) => sum + part.score * part.weight, 0) / parts.reduce((sum, part) => sum + part.weight, 0))
}

function movementScore(actual: number | undefined, full: number, minimum: number) {
  if (actual === undefined) return undefined
  if (actual >= full) return 100
  if (actual >= minimum) return Math.round(60 + 40 * (actual - minimum) / Math.max(1, full - minimum))
  return Math.round(60 * Math.max(0, actual) / Math.max(1, minimum))
}

function trainingScore(data: AppData, plan: DailyPlanSnapshot) {
  if (!plan.targetsSnapshot.workoutTemplate) return undefined
  const session = data.workouts.find((item) => item.date === plan.date)
  if (!session) return undefined
  const workSets = session.sets.filter((set) => set.kind === 'work')
  const setCompletion = workSets.length ? workSets.filter((set) => set.completed).length / workSets.length * 100 : session.completed ? 100 : 0
  const rpeScore = session.sessionRpe === undefined ? undefined : session.sessionRpe <= 7 ? 100 : session.sessionRpe <= 8 ? 70 : 30
  const completion = session.completed ? 100 : session.shortened ? 60 : 20
  const parts = [{ score: setCompletion, weight: 60 }, { score: completion, weight: 15 }]
  if (rpeScore !== undefined) parts.push({ score: rpeScore, weight: 25 })
  return Math.round(parts.reduce((sum, part) => sum + part.score * part.weight, 0) / parts.reduce((sum, part) => sum + part.weight, 0))
}

function nutritionScore(data: AppData, date: string) {
  const log = data.nutritionLogs[date]
  if (!log) return undefined
  if (!log.quality) return log.fluidMl !== undefined ? 30 : undefined
  const quality = { poor: 40, average: 70, excellent: 100 }[log.quality]
  return Math.round(quality * 0.8 + (log.fluidMl !== undefined ? 20 : 0))
}

function mindScore(data: AppData, plan: DailyPlanSnapshot) {
  const session = data.brainSessions.find((item) => item.date === plan.date)
  if (!session) return undefined
  const duration = clamp(session.actualDuration / Math.max(1, session.plannedDuration) * 100)
  const parts = [{ score: duration, weight: 40 }]
  if (session.accuracy !== undefined) parts.push({ score: clamp(session.accuracy), weight: 50 })
  else parts.push({ score: session.completed ? 100 : 0, weight: 50 })
  parts.push({ score: session.difficulty > 0 ? 100 : 0, weight: 10 })
  return Math.round(parts.reduce((sum, part) => sum + part.score * part.weight, 0) / 100)
}

export interface CalculatedScores {
  executionScore?: number
  dayScore?: number
  completeness: number
  preliminary: boolean
  dayStatus: DayStatus
  domainScores: DomainScores
  actionEvaluations: Record<string, ActionEvaluation>
}

export function calculateScores(data: AppData, plan: DailyPlanSnapshot): CalculatedScores {
  const actionEvaluations = Object.fromEntries(plan.plannedActions.map((action) => [action.id, evaluateAction(action, plan, data)]))
  const scoredActions = plan.plannedActions.filter((action) => action.applicable && action.priority !== 'optional')
  const verified = scoredActions.filter((action) => !['UNVERIFIED', 'NOT_APPLICABLE'].includes(actionEvaluations[action.id].status))
  const applicableWeight = scoredActions.reduce((sum, action) => sum + action.executionWeight, 0)
  const verifiedWeight = verified.reduce((sum, action) => sum + action.executionWeight, 0)
  const executionScore = verifiedWeight
    ? Math.round(100 * verified.reduce((sum, action) => sum + action.executionWeight * actionEvaluations[action.id].credit, 0) / verifiedWeight)
    : undefined
  const executionCompleteness = applicableWeight ? verifiedWeight / applicableWeight * 100 : 100

  const domainScores: DomainScores = {
    sleep: sleepScore(data.sleepLogs[plan.date], Object.values(data.sleepLogs)),
    movement: movementScore(data.dailyLogs[plan.date]?.steps, plan.targetsSnapshot.stepsFull, plan.targetsSnapshot.stepsMinimum),
    training: trainingScore(data, plan),
    nutrition: nutritionScore(data, plan.date),
    mind: mindScore(data, plan),
  }
  const domainWeights: Record<keyof DomainScores, number> = { sleep: 25, movement: 20, training: 20, nutrition: 15, mind: 20 }
  const applicableDomains = (Object.keys(domainWeights) as (keyof DomainScores)[]).filter((domain) => domain !== 'training' || Boolean(plan.targetsSnapshot.workoutTemplate))
  const knownDomains = applicableDomains.filter((domain) => domainScores[domain] !== undefined)
  const totalDomainWeight = applicableDomains.reduce((sum, domain) => sum + domainWeights[domain], 0)
  const knownDomainWeight = knownDomains.reduce((sum, domain) => sum + domainWeights[domain], 0)
  const dayScore = knownDomainWeight
    ? Math.round(knownDomains.reduce((sum, domain) => sum + domainWeights[domain] * (domainScores[domain] ?? 0), 0) / knownDomainWeight)
    : undefined
  const domainCompleteness = totalDomainWeight ? knownDomainWeight / totalDomainWeight * 100 : 100
  const completeness = Math.round((executionCompleteness + domainCompleteness) / 2)
  const coreActions = plan.plannedActions.filter((action) => action.applicable && action.priority === 'core')
  const coreStatuses = coreActions.map((action) => actionEvaluations[action.id].status)
  let dayStatus: DayStatus = 'UNVERIFIED'
  if (plan.mode === 'recovery') dayStatus = 'RECOVERY'
  else if (coreStatuses.every((status) => status === 'FULL') && (executionScore ?? 0) >= 85) dayStatus = 'FULL'
  else if (coreStatuses.length && coreStatuses.every((status) => ['FULL', 'MINIMUM'].includes(status)) && coreStatuses.some((status) => status === 'MINIMUM')) dayStatus = 'MINIMUM'
  else if (coreStatuses.some((status) => ['FULL', 'MINIMUM', 'PARTIAL'].includes(status))) dayStatus = 'PARTIAL'
  else if (data.dailyLogs[plan.date]?.closedAt && coreStatuses.every((status) => status === 'MISSED')) dayStatus = 'MISSED'

  return { executionScore, dayScore, completeness, preliminary: completeness < 60, dayStatus, domainScores, actionEvaluations }
}

export function createScoreSnapshot(data: AppData, plan: DailyPlanSnapshot, reason: ScoreSnapshot['reason']): ScoreSnapshot {
  const result = calculateScores(data, plan)
  return {
    id: uid(),
    date: plan.date,
    revision: (data.scoreSnapshots[plan.date]?.length ?? 0) + 1,
    methodologyVersion: plan.methodologyVersion,
    executionScore: result.executionScore,
    dayScore: result.dayScore,
    completeness: result.completeness,
    dayStatus: result.dayStatus,
    domainScores: result.domainScores,
    actionEvaluations: result.actionEvaluations,
    computedAt: new Date().toISOString(),
    reason,
  }
}
