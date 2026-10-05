import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppData, BrainSession, DailyLog, DayMode, MonthlyReview, NutritionLog, Settings,
  SleepLog, WeeklyReview, WeightMeasurement, WorkoutSession,
} from './types'
import { createInitialData, parseAndMigrateData } from './data'
import { createDailyPlan, createPlanRevision } from './program'
import { createScoreSnapshot } from './scoring'
import { getProgramPosition, uid } from './utils'

const initialData = createInitialData()

interface Store extends AppData {
  updateSettings: (patch: Partial<Settings>) => void
  changeProgramStart: (date: string) => void
  ensureDailyPlan: (date: string) => void
  setDayMode: (date: string, mode: DayMode, reason: string) => void
  updateDaily: (date: string, patch: Partial<DailyLog>) => void
  updateSleep: (date: string, patch: Partial<SleepLog>) => void
  updateNutrition: (date: string, patch: Partial<NutritionLog>) => void
  toggleManualAction: (date: string, id: string) => void
  closeDay: (date: string) => void
  addWeight: (date: string, value: number) => WeightMeasurement
  confirmWeight: (id: string) => void
  saveWorkout: (session: WorkoutSession) => void
  saveBrainSession: (session: BrainSession) => void
  saveWeeklyReview: (review: WeeklyReview) => void
  saveMonthlyReview: (review: MonthlyReview) => void
  importData: (data: unknown) => void
  resetData: () => void
}

function dataFromStore(state: Store): AppData {
  return {
    dataVersion: state.dataVersion, settings: state.settings, cycle: state.cycle,
    dailyPlans: state.dailyPlans, planRevisions: state.planRevisions, dailyLogs: state.dailyLogs,
    sleepLogs: state.sleepLogs, nutritionLogs: state.nutritionLogs,
    weightMeasurements: state.weightMeasurements, workouts: state.workouts,
    brainSessions: state.brainSessions, scoreSnapshots: state.scoreSnapshots,
    weeklyReviews: state.weeklyReviews, monthlyReviews: state.monthlyReviews,
  }
}

function withFactRevision(state: Store, date: string, patch: Partial<Store>): Partial<Store> {
  const merged = { ...state, ...patch } as Store
  if (!merged.dailyLogs[date]?.closedAt || !merged.dailyPlans[date]) return patch
  const snapshot = createScoreSnapshot(dataFromStore(merged), merged.dailyPlans[date], 'fact-corrected')
  return { ...patch, scoreSnapshots: { ...merged.scoreSnapshots, [date]: [...(merged.scoreSnapshots[date] ?? []), snapshot] } }
}

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...initialData,
      updateSettings: (patch) => set((state) => {
        const safePatch = { ...patch }
        if (safePatch.programStart && Object.keys(state.dailyPlans).length > 0) delete safePatch.programStart
        const settings = { ...state.settings, ...safePatch }
        const cycle = Object.keys(state.dailyPlans).length === 0 && safePatch.programStart
          ? { ...state.cycle, startDate: safePatch.programStart }
          : state.cycle
        return { settings, cycle }
      }),
      changeProgramStart: (date) => set((state) => ({
        settings: { ...state.settings, programStart: date },
        cycle: {
          ...state.cycle,
          id: uid(),
          startDate: date,
          createdAt: new Date().toISOString(),
        },
        dailyPlans: {},
        planRevisions: {},
        scoreSnapshots: {},
        weeklyReviews: [],
        monthlyReviews: [],
        dailyLogs: Object.fromEntries(Object.entries(state.dailyLogs).map(([key, log]) => [
          key,
          { ...log, manualActionIds: [], closedAt: undefined, updatedAt: new Date().toISOString() },
        ])),
      })),
      ensureDailyPlan: (date) => set((state) => {
        if (state.dailyPlans[date]) return state
        const position = getProgramPosition(state.cycle.startDate, date)
        if (position.status !== 'ACTIVE') return state
        const plan = createDailyPlan({
          cycle: state.cycle, date, programDay: position.day,
          settings: state.settings, workouts: state.workouts,
        })
        return {
          dailyPlans: { ...state.dailyPlans, [date]: plan },
          planRevisions: {
            ...state.planRevisions,
            [plan.id]: [{
              id: plan.currentRevisionId, dailyPlanId: plan.id, revision: 0,
              createdAt: plan.createdAt, mode: 'normal', reason: 'Initial daily plan',
              targetsSnapshot: plan.targetsSnapshot, plannedActions: plan.plannedActions,
            }],
          },
        }
      }),
      setDayMode: (date, mode, reason) => set((state) => {
        const plan = state.dailyPlans[date]
        if (!plan) return state
        const revisions = state.planRevisions[plan.id] ?? []
        const revision = mode === 'normal'
          ? {
              id: uid(), dailyPlanId: plan.id, revision: revisions.length,
              createdAt: new Date().toISOString(), mode, reason,
              targetsSnapshot: structuredClone(plan.originalPlan.targets),
              plannedActions: structuredClone(plan.originalPlan.plannedActions),
            }
          : createPlanRevision(plan, mode, reason, revisions.length)
        const nextPlan = {
          ...plan, mode, currentRevisionId: revision.id,
          targetsSnapshot: revision.targetsSnapshot, plannedActions: revision.plannedActions,
        }
        const partial: Partial<Store> = {
          dailyPlans: { ...state.dailyPlans, [date]: nextPlan },
          planRevisions: { ...state.planRevisions, [plan.id]: [...revisions, revision] },
        }
        const merged = { ...state, ...partial } as Store
        const score = createScoreSnapshot(dataFromStore(merged), nextPlan, 'mode-change')
        return { ...partial, scoreSnapshots: { ...state.scoreSnapshots, [date]: [...(state.scoreSnapshots[date] ?? []), score] } }
      }),
      updateDaily: (date, patch) => set((state) => {
        const dailyLogs = {
          ...state.dailyLogs,
          [date]: {
            ...state.dailyLogs[date],
            ...patch,
            date,
            manualActionIds: patch.manualActionIds ?? state.dailyLogs[date]?.manualActionIds ?? [],
            updatedAt: new Date().toISOString(),
          },
        }
        return withFactRevision(state, date, { dailyLogs })
      }),
      updateSleep: (date, patch) => set((state) => {
        const plan = state.dailyPlans[date]
        const sleepLogs = {
          ...state.sleepLogs,
          [date]: {
            ...state.sleepLogs[date], ...patch,
            id: state.sleepLogs[date]?.id ?? uid(), date,
            targetSleepTime: state.sleepLogs[date]?.targetSleepTime ?? plan?.targetsSnapshot.sleepTarget ?? state.settings.sleepTarget,
            targetWakeTime: state.sleepLogs[date]?.targetWakeTime ?? plan?.targetsSnapshot.wakeTarget ?? state.settings.wakeTarget,
            source: state.sleepLogs[date]?.source ?? 'manual' as const,
            updatedAt: new Date().toISOString(),
          },
        }
        return withFactRevision(state, date, { sleepLogs })
      }),
      updateNutrition: (date, patch) => set((state) => {
        const nutritionLogs = {
          ...state.nutritionLogs,
          [date]: {
            ...state.nutritionLogs[date],
            ...patch,
            id: state.nutritionLogs[date]?.id ?? uid(),
            date,
            items: patch.items ?? state.nutritionLogs[date]?.items ?? [],
            updatedAt: new Date().toISOString(),
          },
        }
        return withFactRevision(state, date, { nutritionLogs })
      }),
      toggleManualAction: (date, id) => set((state) => {
        const log = state.dailyLogs[date] ?? { date, manualActionIds: [], updatedAt: new Date().toISOString() }
        const done = log.manualActionIds.includes(id)
        const dailyLogs = {
          ...state.dailyLogs,
          [date]: { ...log, updatedAt: new Date().toISOString(), manualActionIds: done ? log.manualActionIds.filter((action) => action !== id) : [...log.manualActionIds, id] },
        }
        return withFactRevision(state, date, { dailyLogs })
      }),
      closeDay: (date) => set((state) => {
        const plan = state.dailyPlans[date]
        if (!plan) return state
        const dailyLogs = {
          ...state.dailyLogs,
          [date]: {
            ...state.dailyLogs[date],
            date, manualActionIds: state.dailyLogs[date]?.manualActionIds ?? [],
            closedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          },
        }
        const merged = { ...state, dailyLogs } as Store
        const snapshot = createScoreSnapshot(dataFromStore(merged), plan, 'day-close')
        return { dailyLogs, scoreSnapshots: { ...state.scoreSnapshots, [date]: [...(state.scoreSnapshots[date] ?? []), snapshot] } }
      }),
      addWeight: (date, value) => {
        let created!: WeightMeasurement
        set((state) => {
          const timestamp = `${date}T08:00:00`
          const previous = state.weightMeasurements.filter((item) => item.timestamp < timestamp).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
          const suspicious = Boolean(previous && Math.abs(value - previous.value) / previous.value > 0.03)
          created = {
            id: uid(), timestamp, value,
            unit: state.settings.units === 'imperial' ? 'lb' : 'kg',
            source: 'manual', confirmed: !suspicious, suspicious,
          }
          return { weightMeasurements: [...state.weightMeasurements, created] }
        })
        return created
      },
      confirmWeight: (id) => set((state) => ({
        weightMeasurements: state.weightMeasurements.map((item) => item.id === id ? { ...item, confirmed: true } : item),
      })),
      saveWorkout: (session) => set((state) => {
        const workouts = [...state.workouts.filter((item) => item.id !== session.id), session]
        return withFactRevision(state, session.date, { workouts })
      }),
      saveBrainSession: (session) => set((state) => {
        const brainSessions = [...state.brainSessions.filter((item) => item.date !== session.date), session]
        return withFactRevision(state, session.date, { brainSessions })
      }),
      saveWeeklyReview: (review) => set((state) => ({
        weeklyReviews: [...state.weeklyReviews.filter((item) => item.week !== review.week), review],
      })),
      saveMonthlyReview: (review) => set((state) => ({
        monthlyReviews: [...state.monthlyReviews.filter((item) => item.day !== review.day), review],
      })),
      importData: (data) => set(parseAndMigrateData(data)),
      resetData: () => set(createInitialData()),
    }),
    {
      name: 'personal-90-data',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => parseAndMigrateData(persisted),
      partialize: (state) => ({
        ...dataFromStore(state),
      }),
    },
  ),
)
