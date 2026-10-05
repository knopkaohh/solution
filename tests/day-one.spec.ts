import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'

test('a complete day uses facts, persists, and can be backed up', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.clock.install()
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  await expect(page.getByText(/Что сделать сегодня/)).toBeVisible()
  await page.getByLabel('Заснул').fill('01:10')
  await page.getByLabel('Проснулся').fill('09:20')
  await page.getByLabel(/Качество/).fill('7')
  await page.getByLabel(/Готовность/).fill('4')
  await page.getByRole('button', { name: 'Normal' }).click()
  await expect(page.locator('.mission').filter({ hasText: 'Записать сон' }).getByText('FULL')).toBeVisible()

  await page.getByRole('button', { name: /Вечер · факты/ }).click()
  await page.getByLabel('Шаги').fill('3270')
  await page.getByLabel('Приёмов пищи').fill('2')
  await page.getByLabel('Кофе').fill('2')
  await page.locator('.field').filter({ hasText: 'Сладкое' }).getByRole('button', { name: 'Нет' }).click()
  await page.locator('.field').filter({ hasText: 'Fast food' }).getByRole('button', { name: 'Нет' }).click()
  await page.getByLabel('Вес, кг').fill('119.8')
  await page.getByRole('button', { name: 'Добавить' }).click()

  await page.getByRole('link', { name: /Brain/ }).first().click()
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.clock.fastForward(20 * 60 * 1000)
  await page.getByRole('button', { name: 'Завершить сессию' }).click()
  await expect(page.getByText(/Завершено · 20 мин/)).toBeVisible()

  await page.getByRole('link', { name: 'Тренировки' }).first().click()
  await page.getByLabel('Жим ногами подход 1 вес').fill('40')
  await page.getByLabel('Жим ногами подход 1 повторения').fill('12')
  await page.getByLabel('Жим ногами подход 1 RPE').fill('6')
  await page.locator('.exercise-group').filter({ hasText: 'Жим ногами' }).locator('.set-row').first().locator('.checkbox').click()
  await page.getByLabel('Session RPE').fill('6')
  await page.getByRole('button', { name: /Сохранить тренировку/ }).click()
  await expect(page.getByText('Сохранено')).toBeVisible()

  await page.getByRole('link', { name: 'Сегодня' }).first().click()
  await page.getByRole('button', { name: /Вечер · факты/ }).click()
  await page.getByRole('button', { name: 'Завершить день' }).click()
  await expect(page.getByText(/FULL|PARTIAL|MINIMUM/).last()).toBeVisible()
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
  await page.getByRole('button', { name: /Вечер · факты/ }).click()
  await expect(page.getByLabel('Шаги')).toHaveValue('4200')
  await expect(page.getByLabel('Приёмов пищи')).toHaveValue('2')
  expect(await page.evaluate(() => localStorage.getItem('personal-90-data'))).toContain('119.8')

  await page.getByRole('link', { name: '90 дней' }).first().click()
  await expect(page.locator('.day-cell')).toHaveCount(90)
  await page.getByRole('link', { name: 'Прогресс' }).first().click()
  await expect(page.getByText('119.8')).toBeVisible()

  await page.getByRole('link', { name: 'Настройки' }).first().click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
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
  await page.goto('/')
  await page.getByRole('button', { name: 'Minimum Day' }).click()
  await expect(page.getByText('MINIMUM DAY сохраняет ритм', { exact: false })).toBeVisible()
  await expect(page.locator('.mode-badge')).toHaveText('minimum')
  await page.getByRole('button', { name: /Recovery/ }).click()
  await expect(page.locator('.mode-badge')).toHaveText('recovery')
  await expect(page.getByText(/Recovery не является медицинской рекомендацией/)).toBeVisible()
})

test('mobile navigation exposes all sections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const nav = page.locator('.bottom-nav')
  await expect(nav.getByRole('link')).toHaveCount(6)
  await nav.getByRole('link', { name: /Настройки/ }).click()
  await expect(page.getByRole('heading', { name: 'Настрой систему под себя.' })).toBeVisible()
})
