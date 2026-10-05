import type { BrainCategory, Mission, Settings } from './types'

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
  return programConfig.phases.find((phase) => day >= phase.range[0] && day <= phase.range[1]) ?? programConfig.phases[2]
}

export function getStepGoal(day: number, settings: Settings) {
  if (settings.baseStepGoal !== 3000) return settings.baseStepGoal
  const phase = getPhase(day)
  const phaseDay = Math.max(1, day - phase.range[0] + 1)
  return phase.stepGoals[Math.min(phase.stepGoals.length - 1, Math.floor((phaseDay - 1) / 7))]
}

export function getBrainTask(day: number) {
  return programConfig.brainTasks[(Math.max(1, day) - 1) % programConfig.brainTasks.length]
}

export function getMissions(day: number, date: string, settings: Settings): Mission[] {
  const brain = getBrainTask(day)
  const missions: Mission[] = [
    { id: `${date}-steps`, area: 'BODY', title: `${getStepGoal(day, settings).toLocaleString('ru-RU')} шагов`, detail: 'Можно набрать несколькими короткими прогулками', points: 25 },
    { id: `${date}-brain`, area: 'MIND', title: `${getPhase(day).brainMinutes} минут концентрации`, detail: brain.title, points: 20 },
    { id: `${date}-sleep`, area: 'SLEEP', title: `Подготовка ко сну до ${settings.sleepTarget}`, detail: 'Спокойное завершение дня без перфекционизма', points: 20 },
    { id: `${date}-log`, area: 'NUTRITION', title: 'Короткий дневной check-in', detail: 'Сон, питание и самочувствие — только главное', points: 15 },
  ]
  const weekday = new Date(`${date}T12:00:00`).getDay()
  if (settings.workoutDays.includes(weekday)) {
    missions.splice(1, 0, { id: `${date}-workout`, area: 'GYM', title: day % 2 ? 'Workout A' : 'Workout B', detail: '60–90 мин · или minimum: 15 минут движения', points: 20 })
  } else {
    missions.push({ id: `${date}-movement`, area: 'BODY', title: 'Минимум движения', detail: '5 минут разминки считаются', points: 20 })
  }
  return missions
}
