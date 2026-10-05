import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'

test('Day 1 flow persists and core navigation works', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Добрый/ })).toBeVisible()
  await page.getByRole('button', { name: /Быстрый check-in/ }).click()
  await page.getByLabel('Вес, кг').fill('119.8')
  await page.getByLabel('Шаги').fill('3270')
  await page.getByLabel('Заснул').fill('01:10')
  await page.getByLabel('Проснулся').fill('09:20')
  await page.getByLabel('Приёмов пищи').fill('2')
  await page.getByRole('button', { name: /Начать · 20 мин/ }).click()
  await expect(page.getByRole('button', { name: /Выполнено/ })).toBeVisible()

  await page.getByRole('link', { name: 'Тренировки' }).first().click()
  await expect(page.getByRole('heading', { name: 'Workout A' })).toBeVisible()
  await page.getByLabel('Вес Жим ногами').fill('40')
  await page.getByLabel('Повторы Жим ногами').fill('12')
  await page.locator('.exercise-row').filter({ hasText: 'Жим ногами' }).locator('.checkbox').click()
  await page.getByRole('button', { name: /Завершить тренировку/ }).click()
  await expect(page.getByText('Сохранено')).toBeVisible()

  await page.getByRole('link', { name: 'Прогресс' }).first().click()
  await expect(page.getByText('119.8')).toBeVisible()
  await page.getByRole('link', { name: '90 дней' }).first().click()
  await expect(page.locator('.day-cell')).toHaveCount(90)

  await page.reload()
  await page.goto('/')
  await page.getByRole('button', { name: /Быстрый check-in/ }).click()
  await expect(page.getByLabel('Вес, кг')).toHaveValue('119.8')
  await expect(page.getByLabel('Шаги')).toHaveValue('3270')
  await expect(page.getByLabel('Заснул')).toHaveValue('01:10')
  await expect(page.getByText('Тренировка').last()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('personal-90-data'))).toContain('119.8')

  await page.getByRole('link', { name: 'Настройки' }).first().click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^personal-90-backup-.*\.json$/)
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('personal-90-data')!).state)
  backup.settings.name = 'Антон · backup'
  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.getByLabel('Имя')).toHaveValue('Антон · backup')
  expect(errors).toEqual([])
})

test('mobile navigation exposes all sections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const nav = page.locator('.bottom-nav')
  await expect(nav.getByRole('link')).toHaveCount(6)
  await nav.getByRole('link', { name: /Настройки/ }).click()
  await expect(page.getByRole('heading', { name: 'Настрой систему под себя.' })).toBeVisible()
})
