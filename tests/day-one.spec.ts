import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Пароль').fill('Knopka2000')
  await page.getByRole('button', { name: 'Открыть приложение' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
})

test('a complete day uses facts, persists, and can be backed up', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.clock.install()
  await page.goto('./')

  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  await expect(page.getByText(/Что нужно сделать/)).toBeVisible()
  await page.getByRole('button', { name: /Отметить выполненным: 3.*шагов/ }).click()
  await expect(page.getByRole('button', { name: /Снять отметку: 3.*шагов/ })).toBeVisible()
  await page.getByRole('button', { name: /Итоги дня/ }).click()
  await page.getByLabel('Заснул').fill('01:10')
  await page.getByLabel('Проснулся').fill('09:20')
  await page.getByLabel(/Качество/).fill('7')
  await page.getByLabel('Шаги').fill('3270')

  await page.getByRole('link', { name: /Питание/ }).first().click()
  await page.getByRole('button', { name: /Отлично/ }).click()
  await page.getByLabel('Что и как я сегодня ел').fill('Три обычных приёма пищи')
  await page.getByLabel('Литры').fill('2')
  await page.getByLabel('Вес, кг').fill('119.8')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.getByRole('button', { name: 'Сохранить питание' }).click()

  await page.getByRole('link', { name: /Мышление/ }).first().click()
  await page.getByLabel('Короткая запись').fill('Решал задачи по математике')
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.clock.fastForward(20 * 60 * 1000)
  await page.getByRole('button', { name: 'Завершить занятие' }).click()
  await expect(page.getByText(/Завершено · 20 мин/)).toBeVisible()

  await page.getByRole('link', { name: 'Тренировка' }).first().click()
  await page.getByLabel('Продолжительность').fill('45')
  await page.getByLabel(/Нагрузка по ощущениям/).fill('6')
  await page.getByLabel('Что делал на тренировке').fill('Самостоятельная силовая тренировка')
  await page.getByRole('button', { name: /Сохранить тренировку/ }).click()
  await expect(page.getByText('Сохранено')).toBeVisible()

  await page.getByRole('link', { name: 'Сегодня' }).first().click()
  await page.getByRole('button', { name: /Итоги дня/ }).click()
  await expect(page.getByText('Завершено · 20 мин')).toBeVisible()
  await expect(page.getByText(/Оценка 60 из 100/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Завершить день' }).click()
  await expect(page.getByText(/Выполнено|Частично|Минимальный день/).last()).toBeVisible()
  const revisionsBefore = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('personal-90-data')!).state
    return Object.values(state.scoreSnapshots)[0].length
  })
  await page.getByLabel('Шаги').fill('4200')
  const revisionsAfter = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('personal-90-data')!).state
    return Object.values(state.scoreSnapshots)[0].length
  })
  expect(revisionsAfter).toBeGreaterThan(revisionsBefore)

  await page.reload()
  await page.getByRole('button', { name: /Итоги дня/ }).click()
  await expect(page.getByLabel('Шаги')).toHaveValue('4200')
  await page.getByRole('link', { name: /Питание и вес/ }).click()
  await expect(page.getByLabel('Литры')).toHaveValue('2')
  expect(await page.evaluate(() => localStorage.getItem('personal-90-data'))).toContain('119.8')

  await page.getByRole('link', { name: '90 дней' }).first().click()
  await expect(page.locator('.day-cell')).toHaveCount(90)
  await page.getByRole('link', { name: 'Прогресс' }).first().click()
  await expect(page.getByText('119.8')).toBeVisible()

  await page.getByRole('link', { name: 'Настройки' }).first().click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать копию' }).click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/^personal-90-backup-.*\.json$/)

  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('personal-90-data')!).state)
  backup.settings.name = 'Антон · restored'
  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup-v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.getByLabel('Имя')).toHaveValue('Антон · restored')
  expect(errors).toEqual([])
})

test('minimum and recovery are distinct modes', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Упростить день' }).click()
  await expect(page.locator('.mode-badge')).toHaveText('Минимальный день')
  await page.getByRole('button', { name: /Восстановление/ }).click()
  await expect(page.locator('.mode-badge')).toHaveText('Восстановление')
  await expect(page.getByText(/Режим восстановления не является медицинской рекомендацией/)).toBeVisible()
})

test('mobile navigation exposes all sections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('./')
  const nav = page.locator('.bottom-nav')
  await expect(nav.getByRole('link')).toHaveCount(5)
  await nav.getByRole('link', { name: /Ещё/ }).click()
  await page.getByRole('link', { name: /Настройки/ }).click()
  await expect(page.getByRole('heading', { name: 'Настрой систему под себя.' })).toBeVisible()
})

test('password gate rejects an incorrect password', async ({ page }) => {
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await page.getByLabel('Пароль').fill('1111')
  await page.getByRole('button', { name: 'Открыть приложение' }).click()
  await expect(page.getByText('Неверный пароль')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Сегодня' })).toHaveCount(0)
})
