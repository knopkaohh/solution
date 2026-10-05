import type {
  AdaptiveStateSnapshot, BrainCategory, DailyPlanSnapshot, DailyTargetsSnapshot,
  PlanRevision, PlannedAction, ProgramCycle, ProgramPhase, Settings, WorkoutSession,
  WorkoutTemplate,
} from './types'
import { METHODOLOGY_VERSION } from './types'
import { uid } from './utils'

export const programConfig = {
  phases: [
    {
      id: 1,
      name: 'RESET',
      range: [1, 30],
      description: 'Собрать базу: мягко вернуть движение, сон и регулярность.',
      stepGoals: [3000, 3500, 4000, 4500, 5000],
      brainMinutes: 20,
    },
    {
      id: 2,
      name: 'BUILD',
      range: [31, 60],
      description: 'Закрепить тренировки и постепенно повысить объём работы.',
      stepGoals: [5500, 6000, 6500, 7000, 7000],
      brainMinutes: 25,
    },
    {
      id: 3,
      name: 'LEVEL UP',
      range: [61, 90],
      description: 'Стабилизировать систему и подготовить следующий цикл.',
      stepGoals: [7000, 7500, 8000, 8000, 8500],
      brainMinutes: 30,
    },
  ],
  brainTasks: [
    { category: 'MEMORY', title: 'Активное воспроизведение', detail: 'Прочитай короткий текст и запиши 5 тезисов по памяти.' },
    { category: 'FOCUS', title: 'Один фокус-блок', detail: 'Работай без телефона и переключений.' },
    { category: 'LOGIC', title: 'Логическая разминка', detail: 'Реши 3 задачи на закономерности или вероятность.' },
    { category: 'CRITICAL THINKING', title: 'Проверка утверждения', detail: 'Найди источник, допущения и альтернативное объяснение.' },
    { category: 'SPEED', title: 'Быстрый счёт', detail: 'Решай простые операции на время 10 минут.' },
  ] as { category: BrainCategory; title: string; detail: string }[],
}

export function getPhase(day: number) {
  return programConfig.phases.find((phase) => day >= phase.range[0] && day <= phase.range[1]) ?? (day < 1 ? programConfig.phases[0] : programConfig.phases[2])
}

export function getStepGoal(day: number, settings: Settings) {
  const phase = getPhase(day)
  const phaseDay = Math.max(1, day - phase.range[0] + 1)
  const configuredOffset = settings.baseStepGoal - 3000
  return Math.max(1000, phase.stepGoals[Math.min(phase.stepGoals.length - 1, Math.floor((phaseDay - 1) / 7))] + configuredOffset)
}

export function getBrainTask(day: number) {
  return programConfig.brainTasks[(Math.max(1, day) - 1) % programConfig.brainTasks.length]
}

export function getNextWorkoutTemplate(workouts: WorkoutSession[]): WorkoutTemplate {
  const last = workouts
    .filter((workout) => workout.completed)
    .sort((a, b) => `${b.date}-${b.endedAt ?? ''}`.localeCompare(`${a.date}-${a.endedAt ?? ''}`))[0]
  return last?.template === 'A' ? 'B' : 'A'
}

export function getTargets(day: number, date: string, settings: Settings): DailyTargetsSnapshot {
  const stepsFull = getStepGoal(day, settings)
  const workoutScheduled = settings.workoutDays.includes(new Date(`${date}T12:00:00`).getDay())
  return {
    stepsFull,
    stepsMinimum: Math.max(1000, Math.round((stepsFull * 0.5) / 250) * 250),
    movementMinutesMinimum: 10,
    brainMinutesFull: settings.brainMinutes || getPhase(day).brainMinutes,
    brainMinutesMinimum: 5,
    sleepTarget: settings.sleepTarget,
    wakeTarget: settings.wakeTarget,
    nutritionMode: settings.nutritionMode,
    workoutTemplate: workoutScheduled ? 'CUSTOM' : undefined,
    workoutMinutesMinimum: workoutScheduled ? 15 : undefined,
  }
}

export function createPlannedActions(_day: number, date: string, targets: DailyTargetsSnapshot): PlannedAction[] {
  const actions: PlannedAction[] = [
    {
      id: `${date}-sleep`, domain: 'SLEEP', type: 'sleep-log', label: 'Записать сон',
      detail: `Цель ${targets.sleepTarget} → ${targets.wakeTarget}`, evidenceType: 'SLEEP_LOG',
      executionWeight: 2, priority: 'core', applicable: true, manualAllowed: true,
    },
    {
      id: `${date}-steps`, domain: 'MOVEMENT', type: 'steps', label: `${targets.stepsFull.toLocaleString('ru-RU')} шагов`,
      detail: `Минимальная версия: ${targets.stepsMinimum.toLocaleString('ru-RU')} шагов или 10 минут движения`,
      evidenceType: 'STEPS', fullTarget: targets.stepsFull, minimumTarget: targets.stepsMinimum,
      executionWeight: 2, priority: 'core', applicable: true, manualAllowed: true,
    },
    {
      id: `${date}-brain`, domain: 'MIND', type: 'brain-session', label: `Развитие мышления · ${targets.brainMinutesFull} минут`,
      detail: 'Самостоятельно выбери занятие и запиши, что делал', evidenceType: 'BRAIN', fullTarget: targets.brainMinutesFull, minimumTarget: targets.brainMinutesMinimum,
      executionWeight: 2, priority: 'core', applicable: true, manualAllowed: true,
    },
    {
      id: `${date}-nutrition`, domain: 'NUTRITION', type: 'nutrition-log', label: 'Записать питание',
      detail: 'Оцени питание, добавь комментарий и количество жидкости',
      evidenceType: 'NUTRITION_LOG', executionWeight: 2, priority: 'core', applicable: true, manualAllowed: true,
    },
    {
      id: `${date}-sleep-prep`, domain: 'SLEEP', type: 'sleep-preparation', label: `Подготовка ко сну к ${targets.sleepTarget}`,
      detail: 'Единственное ручное действие дня', evidenceType: 'MANUAL',
      executionWeight: 1, priority: 'support', applicable: true, manualAllowed: true,
    },
  ]
  if (targets.workoutTemplate) {
    actions.splice(2, 0, {
      id: `${date}-workout`, domain: 'TRAINING', type: 'workout', label: 'Потренироваться',
      detail: 'После занятия запиши продолжительность и что делал', evidenceType: 'WORKOUT',
      minimumTarget: targets.workoutMinutesMinimum,
      executionWeight: 3, priority: 'core', applicable: true, manualAllowed: true,
    })
  }
  return actions
}

function copyPlan<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createDailyPlan(input: {
  cycle: ProgramCycle
  date: string
  programDay: number
  settings: Settings
  workouts: WorkoutSession[]
  now?: string
}): DailyPlanSnapshot {
  const createdAt = input.now ?? new Date().toISOString()
  const targets = getTargets(input.programDay, input.date, input.settings)
  const plannedActions = createPlannedActions(input.programDay, input.date, targets)
  const adaptiveStateSnapshot: AdaptiveStateSnapshot = {
    stepLevel: targets.stepsFull,
    brainMinutes: targets.brainMinutesFull,
    workoutVolume: input.programDay <= 14 ? 'intro' : 'standard',
    capturedAt: createdAt,
  }
  const revisionId = uid()
  return {
    id: `plan-${input.cycle.id}-${input.date}`,
    cycleId: input.cycle.id,
    date: input.date,
    programDay: input.programDay,
    phase: getPhase(input.programDay).name as ProgramPhase,
    createdAt,
    methodologyVersion: METHODOLOGY_VERSION,
    adaptiveStateSnapshot,
    targetsSnapshot: copyPlan(targets),
    plannedActions: copyPlan(plannedActions),
    originalPlan: { mode: 'normal', targets: copyPlan(targets), plannedActions: copyPlan(plannedActions) },
    currentRevisionId: revisionId,
    mode: 'normal',
  }
}

export function createPlanRevision(plan: DailyPlanSnapshot, mode: 'minimum' | 'recovery', reason: string, revision: number): PlanRevision {
  const targets = copyPlan(plan.originalPlan.targets)
  let actions = copyPlan(plan.originalPlan.plannedActions)
  if (mode === 'minimum') {
    actions = actions.map((action) => {
      if (action.type === 'steps') return { ...action, label: `${targets.stepsMinimum.toLocaleString('ru-RU')} шагов или 10 минут движения`, detail: 'Минимальное движение' }
      if (action.type === 'brain-session') return { ...action, label: `Развитие мышления · ${targets.brainMinutesMinimum} минут`, detail: 'Самостоятельное короткое занятие' }
      if (action.type === 'workout') return { ...action, label: 'Сокращённая тренировка · 15–25 минут', detail: '2–3 безопасных двигательных паттерна' }
      return action
    })
  } else {
    actions = actions.map((action) => ({
      ...action,
      applicable: action.type === 'sleep-log',
      priority: action.type === 'sleep-log' ? 'core' : 'optional',
      label: action.type === 'sleep-log' ? 'Записать сон и самочувствие' : action.label,
    }))
  }
  return {
    id: uid(),
    dailyPlanId: plan.id,
    revision,
    createdAt: new Date().toISOString(),
    mode,
    reason,
    targetsSnapshot: targets,
    plannedActions: actions,
  }
}
