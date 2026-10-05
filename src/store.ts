import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { format } from 'date-fns'
import type {
  AppData, BrainSession, DailyLog, MonthlyReview, NutritionLog, Settings,
  SleepLog, WeeklyReview, WorkoutSession,
} from './types'

const initialData: AppData = {
  version: 1,
  settings: {
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
  },
  dailyLogs: {},
  sleepLogs: {},
  nutritionLogs: {},
  workouts: [],
  brainSessions: [],
  weeklyReviews: [],
  monthlyReviews: [],
}

interface Store extends AppData {
  updateSettings: (patch: Partial<Settings>) => void
  updateDaily: (date: string, patch: Partial<DailyLog>) => void
  updateSleep: (date: string, patch: Partial<SleepLog>) => void
  updateNutrition: (date: string, patch: Partial<NutritionLog>) => void
  toggleTask: (date: string, id: string) => void
  saveWorkout: (session: WorkoutSession) => void
  saveBrainSession: (session: BrainSession) => void
  saveWeeklyReview: (review: WeeklyReview) => void
  saveMonthlyReview: (review: MonthlyReview) => void
  importData: (data: AppData) => void
  resetData: () => void
}

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...initialData,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      updateDaily: (date, patch) => set((state) => ({
        dailyLogs: {
          ...state.dailyLogs,
          [date]: {
            ...state.dailyLogs[date],
            ...patch,
            date,
            completedTaskIds: patch.completedTaskIds ?? state.dailyLogs[date]?.completedTaskIds ?? [],
          },
        },
      })),
      updateSleep: (date, patch) => set((state) => ({
        sleepLogs: { ...state.sleepLogs, [date]: { ...state.sleepLogs[date], ...patch, date } },
      })),
      updateNutrition: (date, patch) => set((state) => ({
        nutritionLogs: {
          ...state.nutritionLogs,
          [date]: {
            ...state.nutritionLogs[date],
            ...patch,
            date,
            meals: patch.meals ?? state.nutritionLogs[date]?.meals ?? 0,
            sweets: patch.sweets ?? state.nutritionLogs[date]?.sweets ?? false,
            coffee: patch.coffee ?? state.nutritionLogs[date]?.coffee ?? 0,
            items: patch.items ?? state.nutritionLogs[date]?.items ?? [],
          },
        },
      })),
      toggleTask: (date, id) => set((state) => {
        const log = state.dailyLogs[date] ?? { date, completedTaskIds: [] }
        const done = log.completedTaskIds.includes(id)
        return {
          dailyLogs: {
            ...state.dailyLogs,
            [date]: { ...log, completedTaskIds: done ? log.completedTaskIds.filter((task) => task !== id) : [...log.completedTaskIds, id] },
          },
        }
      }),
      saveWorkout: (session) => set((state) => ({
        workouts: [...state.workouts.filter((item) => item.id !== session.id), session],
      })),
      saveBrainSession: (session) => set((state) => ({
        brainSessions: [...state.brainSessions.filter((item) => item.id !== session.id), session],
      })),
      saveWeeklyReview: (review) => set((state) => ({
        weeklyReviews: [...state.weeklyReviews.filter((item) => item.week !== review.week), review],
      })),
      saveMonthlyReview: (review) => set((state) => ({
        monthlyReviews: [...state.monthlyReviews.filter((item) => item.day !== review.day), review],
      })),
      importData: (data) => set({ ...initialData, ...data, version: 1 }),
      resetData: () => set(initialData),
    }),
    {
      name: 'personal-90-data',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        version: state.version,
        settings: state.settings,
        dailyLogs: state.dailyLogs,
        sleepLogs: state.sleepLogs,
        nutritionLogs: state.nutritionLogs,
        workouts: state.workouts,
        brainSessions: state.brainSessions,
        weeklyReviews: state.weeklyReviews,
        monthlyReviews: state.monthlyReviews,
      }),
    },
  ),
)
