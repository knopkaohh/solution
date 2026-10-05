export type Theme = 'dark' | 'light' | 'system'
export type NutritionMode = 'simple' | 'advanced'
export type DayStatus = 'good' | 'partial' | 'missed' | 'future'
export type BrainCategory = 'MEMORY' | 'FOCUS' | 'LOGIC' | 'CRITICAL THINKING' | 'SPEED'

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

export interface SleepLog {
  date: string
  wentToBed?: string
  fellAsleep?: string
  wokeUp?: string
  gotUp?: string
  durationMinutes?: number
  quality?: number
  awakenings?: number
  lateCoffee?: boolean
  napMinutes?: number
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
  date: string
  meals: number
  sweets: boolean
  coffee: number
  water?: number
  rating?: number
  items: NutritionItem[]
}

export interface DailyLog {
  date: string
  weight?: number
  steps?: number
  mood?: number
  note?: string
  completedTaskIds: string[]
}

export interface ExerciseSet {
  weight?: number
  reps?: number
}

export interface ExerciseResult {
  name: string
  done: boolean
  sets: ExerciseSet[]
}

export interface WorkoutSession {
  id: string
  date: string
  template: 'A' | 'B' | 'MINIMUM'
  duration: number
  completed: boolean
  exercises: ExerciseResult[]
  note?: string
}

export interface BrainSession {
  id: string
  date: string
  category: BrainCategory
  minutes: number
  score?: number
  completed: boolean
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
  version: number
  settings: Settings
  dailyLogs: Record<string, DailyLog>
  sleepLogs: Record<string, SleepLog>
  nutritionLogs: Record<string, NutritionLog>
  workouts: WorkoutSession[]
  brainSessions: BrainSession[]
  weeklyReviews: WeeklyReview[]
  monthlyReviews: MonthlyReview[]
}

export interface Mission {
  id: string
  area: 'BODY' | 'GYM' | 'MIND' | 'MEMORY' | 'SLEEP' | 'NUTRITION'
  title: string
  detail: string
  points: number
}
