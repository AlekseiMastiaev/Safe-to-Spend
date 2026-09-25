<script setup lang="ts">
import { ref } from 'vue'
import { db } from '@/shared/db/database'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const notifications = useNotificationStore()
const selectedMonth = useSelectedMonthStore()
const isResetting = ref(false)

async function exportBackup(): Promise<void> {
  try {
    const [
      settings,
      budgetMonths,
      incomes,
      obligationTemplates,
      monthlyObligations,
      obligationPayments,
      freeExpenses,
    ] = await Promise.all([
      db.settings.toArray(),
      db.budgetMonths.toArray(),
      db.incomes.toArray(),
      db.obligationTemplates.toArray(),
      db.monthlyObligations.toArray(),
      db.obligationPayments.toArray(),
      db.freeExpenses.toArray(),
    ])
    const backup = {
      format: 'safe-to-spend-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        budgetMonths,
        incomes,
        obligationTemplates,
        monthlyObligations,
        obligationPayments,
        freeExpenses,
      },
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `safe-to-spend-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    notifications.notifySuccess('Резервная копия скачана')
  } catch {
    notifications.notifyError('Не удалось создать резервную копию')
  }
}

async function resetApplication(): Promise<void> {
  if (
    isResetting.value ||
    !window.confirm('Удалить все месяцы, доходы, расходы и настройки? Это действие необратимо.')
  ) {
    return
  }
  isResetting.value = true
  try {
    await db.transaction(
      'rw',
      [
        db.settings,
        db.budgetMonths,
        db.incomes,
        db.obligationTemplates,
        db.monthlyObligations,
        db.obligationPayments,
        db.freeExpenses,
      ],
      async () => {
        await Promise.all([
          db.settings.clear(),
          db.budgetMonths.clear(),
          db.incomes.clear(),
          db.obligationTemplates.clear(),
          db.monthlyObligations.clear(),
          db.obligationPayments.clear(),
          db.freeExpenses.clear(),
        ])
      },
    )
    selectedMonth.clearSelectedMonth()
    notifications.notifySuccess('Все локальные данные удалены')
  } catch {
    notifications.notifyError('Не удалось удалить данные')
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="settings-title">
    <div class="page-heading">
      <h2 id="settings-title">Настройки</h2>
      <p>Данные хранятся только в IndexedDB этого браузера.</p>
    </div>

    <div class="panel selection-actions">
      <h3>Резервная копия</h3>
      <p>Скачайте JSON-файл перед очисткой браузера или переездом на другое устройство.</p>
      <button class="button" type="button" @click="exportBackup">Скачать копию</button>
    </div>

    <div class="panel selection-actions">
      <h3>Сброс приложения</h3>
      <p>Удалит все локальные данные и вернёт экран первого запуска.</p>
      <button
        class="button button--danger"
        type="button"
        :disabled="isResetting"
        @click="resetApplication"
      >
        {{ isResetting ? 'Удаляем…' : 'Удалить все данные' }}
      </button>
    </div>
  </section>
</template>
