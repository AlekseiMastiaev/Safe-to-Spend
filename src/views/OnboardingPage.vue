<script setup lang="ts">
import { ref } from 'vue'
import { getCurrentMonthKey } from '@/domain/month'
import { db } from '@/shared/db/database'
import { DexieOnboardingRepository } from '@/shared/db/onboarding'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const notifications = useNotificationStore()
const selectedMonth = useSelectedMonthStore()
const monthKey = ref(getCurrentMonthKey())
const isSaving = ref(false)
const error = ref<string | null>(null)

async function startBudget(): Promise<void> {
  if (isSaving.value) return
  isSaving.value = true
  error.value = null
  monthKey.value = getCurrentMonthKey()

  try {
    const month = await new DexieOnboardingRepository(db).initialize(monthKey.value)
    selectedMonth.setSelectedMonthKey(month.monthKey)
    notifications.notifySuccess('Бюджетный месяц создан')
  } catch {
    error.value = 'Не удалось завершить первый запуск. Попробуйте снова.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="onboarding" aria-labelledby="onboarding-title" :aria-busy="isSaving">
    <h2 id="onboarding-title">Начнём с бюджетного месяца</h2>
    <p>Создайте бюджет на {{ monthKey }} и сразу начните добавлять доходы и расходы.</p>
    <p>Начальные настройки: рубли, русский формат чисел и системная тема.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button type="button" :disabled="isSaving" @click="startBudget">
      {{ isSaving ? 'Создаём месяц…' : 'Создать бюджетный месяц' }}
    </button>
  </section>
</template>

<style scoped>
.onboarding {
  max-width: 40rem;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.onboarding h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-xl);
}

.onboarding p {
  line-height: 1.5;
}

.onboarding [role='alert'] {
  color: var(--color-negative);
}

.onboarding button {
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  color: var(--color-interactive-contrast);
  background: var(--color-interactive);
  cursor: pointer;
}

.onboarding button:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
