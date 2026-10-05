# PERSONAL 90

Персональная система развития на 90 дней: неизменяемый дневной план,
фактические данные, Execution/Day Score, сон, движение, силовые тренировки,
питание, Brain Lab, reviews и аналитика.

## Методология v2

- При первом открытии дня создаётся `DailyPlanSnapshot`.
- Измеримые actions выполняются автоматически на основании фактов.
- `Minimum Day` и `Recovery` сохраняются отдельными revisions.
- Исправление закрытого дня пересчитывает score, не изменяя исходный план.
- `UNVERIFIED` означает отсутствие данных и не приравнивается к пропуску.
- Вес хранится отдельными measurements; основной тренд — 7-day average.

## Запуск

```bash
npm install
npm run dev
```

Приложение работает без backend. Все записи схемы `dataVersion: 2`
сохраняются в `localStorage`; v1 мигрирует автоматически. Резервную копию
можно скачать и безопасно восстановить в Settings.

## Проверки

```bash
npm run build
npm run lint
npm test
```

Unit-тесты проверяют даты программы, snapshots, scoring, режимы, вес,
очередь A/B и миграцию. Browser-тест проходит полный Day 1 и проверяет
Brain/Workout, revisions, reload, mobile-навигацию и export/import.
