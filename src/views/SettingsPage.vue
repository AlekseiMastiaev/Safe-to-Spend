<script setup lang="ts">
import { ref } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import { invalidateData } from '@/composables/useDataQuery'
import { dataMaintenanceRepository, persistenceMode } from '@/shared/persistence'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const notifications = useNotificationStore()
const selectedMonth = useSelectedMonthStore()
const auth = useAuthStore()
const isResetting = ref(false)
const isResetDialogOpen = ref(false)

async function exportBackup(): Promise<void> {
  try {
    const data = await dataMaintenanceRepository.exportAll()
    const backup = {
      format: 'safe-to-spend-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
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
  if (isResetting.value) return
  isResetting.value = true
  try {
    await dataMaintenanceRepository.clearAll()
    isResetDialogOpen.value = false
    selectedMonth.clearSelectedMonth()
    invalidateData()
    notifications.notifySuccess(
      persistenceMode === 'cloud' ? 'Все облачные данные удалены' : 'Все локальные данные удалены',
    )
  } catch {
    notifications.notifyError('Не удалось удалить данные')
  } finally {
    isResetting.value = false
  }
}

function closeResetDialog(): void {
  if (!isResetting.value) isResetDialogOpen.value = false
}

async function signOut(): Promise<void> {
  try {
    await auth.signOut()
    selectedMonth.clearSelectedMonth()
  } catch {
    notifications.notifyError('Не удалось выйти из аккаунта')
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="settings-title">
    <div class="page-heading">
      <h2 id="settings-title">Настройки</h2>
      <p v-if="persistenceMode === 'cloud'">
        Данные синхронизируются через облако для аккаунта {{ auth.userEmail }}.
      </p>
      <p v-else>Данные хранятся только в IndexedDB этого браузера.</p>
    </div>

    <div v-if="persistenceMode === 'cloud'" class="panel selection-actions">
      <h3>Аккаунт</h3>
      <p>{{ auth.userEmail }}</p>
      <button class="button button--secondary" type="button" @click="signOut">Выйти</button>
    </div>

    <div class="panel selection-actions">
      <h3>Резервная копия</h3>
      <p>Скачайте JSON-файл перед очисткой браузера или переездом на другое устройство.</p>
      <button class="button" type="button" @click="exportBackup">Скачать копию</button>
    </div>

    <div class="panel selection-actions">
      <h3>Сброс приложения</h3>
      <p>
        {{
          persistenceMode === 'cloud'
            ? 'Удалит данные аккаунта на всех устройствах и вернёт экран первого запуска.'
            : 'Удалит все локальные данные и вернёт экран первого запуска.'
        }}
      </p>
      <button
        class="button button--danger"
        type="button"
        :disabled="isResetting"
        @click="isResetDialogOpen = true"
      >
        {{ isResetting ? 'Удаляем…' : 'Удалить все данные' }}
      </button>
    </div>

    <AppDialog v-if="isResetDialogOpen" title="Удалить все данные?" @close="closeResetDialog">
      <div class="reset-confirmation">
        <p>Будут удалены все месяцы, доходы, расходы и настройки. Это действие необратимо.</p>
        <div class="button-row">
          <button
            class="button button--danger"
            type="button"
            :disabled="isResetting"
            @click="resetApplication"
          >
            {{ isResetting ? 'Удаляем…' : 'Да, удалить' }}
          </button>
          <button
            class="button button--secondary"
            type="button"
            :disabled="isResetting"
            @click="closeResetDialog"
          >
            Нет, оставить
          </button>
        </div>
      </div>
    </AppDialog>
  </section>
</template>

<style scoped>
.reset-confirmation {
  display: grid;
  gap: var(--space-4);
}

.reset-confirmation p {
  margin: 0;
  line-height: 1.5;
}
</style>
