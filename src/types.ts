export const DATA_VERSION = 2 as const
export const METHODOLOGY_VERSION = '2.0' as const

export type Theme = 'dark' | 'light' | 'system'
export type NutritionMode = 'simple' | 'advanced'
export type ProgramPhase = 'RESET' | 'BUILD' | 'LEVEL UP'
export type ProgramStatus = 'BEFORE' | 'ACTIVE' | 'COMPLETED'
export type DayMode = 'normal' | 'minimum' | 'recovery'
export type DayCondition = 'normal' | 'tired' | 'pain' | 'ill'
export type DayStatus = 'FULL' | 'MINIMUM' | 'PARTIAL' | 'MISSED' | 'RECOVERY' | 'UNVERIFIED' | 'FUTURE'
export type ActionStatus = 'FULL' | 'MINIMUM' | 'PARTIAL' | 'MISSED' | 'NOT_APPLICABLE' | 'UNVERIFIED' | 'RECOVERY_ACTION_FULL'
export type ActionPriority = 'core' | 'support' | 'optional'
export type ActionDomain = 'SLEEP' | 'MOVEMENT' | 'TRAINING' | 'NUTRITION' | 'MIND'
export type EvidenceType = 'STEPS' | 'MOVEMENT_MINUTES' | 'WORKOUT' | 'BRAIN' | 'SLEEP_LOG' | 'NUTRITION_LOG' | 'MANUAL'
export type BrainCategory = 'MEMORY' | 'FOCUS' | 'LOGIC' | 'CRITICAL THINKING' | 'SPEED'
export type WorkoutTemplate = 'A' | 'B'

export interface Settings {
  name: string
  programStart: string
  wakeTarget: string
  sleepTarget: string
  workoutDays: number[]
  baseStepGoal: number
  brainMinutes: number
  units: 'metric' | 'imperial'
  theme: Theme
  nutritionMode: NutritionMode
  notifications: boolean
}

export interface ProgramCycle {
  id: string
  startDate: string
  methodologyVersion: string
  createdAt: string
}

export interface AdaptiveStateSnapshot {
  stepLevel: number
  brainMinutes: number
  workoutVolume: 'intro' | 'standard'
  capturedAt: string
}

export interface DailyTargetsSnapshot {
  stepsFull: number
  stepsMinimum: number
  movementMinutesMinimum: number
  brainMinutesFull: number
  brainMinutesMinimum: number
  sleepTarget: string
  wakeTarget: string
  nutritionMode: NutritionMode
  workoutTemplate?: WorkoutTemplate
  workoutMinutesMinimum?: number
}

export interface ActionEvaluation {
  status: ActionStatus
  credit: number
  actual?: number | string | boolean
  target?: number | string | boolean
  evidenceIds: string[]
  explanation: string
  evaluatedAt: string
}

export interface PlannedAction {
  id: string
  domain: ActionDomain
  type: string
  label: string
  detail: string
  evidenceType: EvidenceType
  fullTarget?: number
  minimumTarget?: number
  executionWeight: number
  priority: ActionPriority
  applicable: boolean
  manualAllowed: boolean
  evaluation?: ActionEvaluation
}

export interface OriginalDailyPlan {
  mode: 'normal'
  targets: DailyTargetsSnapshot
  plannedActions: PlannedAction[]
}

export interface DailyPlanSnapshot {
  id: string
  cycleId: string
  date: string
  programDay: number
  phase: ProgramPhase
  createdAt: string
  methodologyVersion: string
  adaptiveStateSnapshot: AdaptiveStateSnapshot
  targetsSnapshot: DailyTargetsSnapshot
  plannedActions: PlannedAction[]
  originalPlan: OriginalDailyPlan
  currentRevisionId: string
  mode: DayMode
}

export interface PlanRevision {
  id: string
  dailyPlanId: string
  revision: number
  createdAt: string
  mode: DayMode
  reason: string
  targetsSnapshot: DailyTargetsSnapshot
  plannedActions: PlannedAction[]
}

export interface DailyLog {
  date: string
  steps?: number
  movementMinutes?: number
  readiness?: number
  condition?: DayCondition
  difficulty?: 'easier' | 'as-planned' | 'harder'
  note?: string
  manualActionIds: string[]
  updatedAt: string
  closedAt?: string
}

export interface WeightMeasurement {
  id: string
  timestamp: string
  value: number
  unit: 'kg' | 'lb'
  source: 'manual' | 'import'
  confirmed: boolean
  suspicious: boolean
}

export interface SleepLog {
  id: string
  date: string
  bedtime?: string
  sleepOnset?: string
  wakeTime?: string
  getUpTime?: string
  durationMinutes?: number
  quality?: number
  awakenings?: number
  napMinutes?: number
  lastCaffeineAt?: string
  targetSleepTime: string
  targetWakeTime: string
  source: 'manual' | 'import'
  updatedAt: string
}

export interface NutritionItem {
  id: string
  meal: 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус'
  name: string
  amount?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
}

export interface NutritionLog {
  id: string
  date: string
  meals?: number
  sweets?: boolean
  fastFood?: boolean
  coffee?: number
  water?: number
  rating?: number
  items: NutritionItem[]
  updatedAt: string
}

export interface ExerciseSet {
  id: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight?: number
  reps?: number
  rpe?: number
  completed: boolean
  kind: 'warmup' | 'work'
  notes?: string
}

export interface WorkoutSession {
  id: string
  date: string
  template: WorkoutTemplate
  startedAt?: string
  endedAt?: string
  durationMinutes: number
  sessionRpe?: number
  completed: boolean
  shortened: boolean
  recoveryMode: boolean
  notes?: string
  sets: ExerciseSet[]
}

export interface BrainSession {
  id: string
  date: string
  category: BrainCategory
  task: string
  difficulty: number
  plannedDuration: number
  actualDuration: number
  accuracy?: number
  correct?: number
  total?: number
  interruptions?: number
  fatigue?: number
  result?: string
  completed: boolean
  startedAt?: string
  completedAt?: string
}

export interface DomainScores {
  sleep?: number
  movement?: number
  training?: number
  nutrition?: number
  mind?: number
}

export interface ScoreSnapshot {
  id: string
  date: string
  revision: number
  methodologyVersion: string
  executionScore?: number
  dayScore?: number
  completeness: number
  dayStatus: DayStatus
  domainScores: DomainScores
  actionEvaluations: Record<string, ActionEvaluation>
  computedAt: string
  reason: 'day-close' | 'fact-corrected' | 'mode-change' | 'migration'
}

export interface ReviewRatings {
  body: number
  sleep: number
  mind: number
  discipline: number
  wellbeing: number
}

export interface WeeklyReview {
  week: number
  createdAt: string
  wins: string
  misses: string
  hardest: string
  blockers: string
  change: string
  ratings: ReviewRatings
}

export interface MonthlyReview {
  day: 30 | 60 | 90
  createdAt: string
  note: string
  ratings: ReviewRatings
}

export interface AppData {
  dataVersion: typeof DATA_VERSION
  settings: Settings
  cycle: ProgramCycle
  dailyPlans: Record<string, DailyPlanSnapshot>
  planRevisions: Record<string, PlanRevision[]>
  dailyLogs: Record<string, DailyLog>
  sleepLogs: Record<string, SleepLog>
  nutritionLogs: Record<string, NutritionLog>
  weightMeasurements: WeightMeasurement[]
  workouts: WorkoutSession[]
  brainSessions: BrainSession[]
  scoreSnapshots: Record<string, ScoreSnapshot[]>
  weeklyReviews: WeeklyReview[]
  monthlyReviews: MonthlyReview[]
}
