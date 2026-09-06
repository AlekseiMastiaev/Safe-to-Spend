<script setup lang="ts">
import { ref } from 'vue'
import BudgetCard from '@/components/BudgetCard.vue'

const selectedCard = ref('')

function selectCard(title: string) {
  selectedCard.value = title
}
</script>

<template>
  <section class="start-screen" aria-labelledby="dashboard-title">
    <h2 id="dashboard-title">Главная</h2>
    <p>Карточки получают данные от родителя и сообщают ему о выборе событием.</p>

    <div class="budget-cards">
      <BudgetCard
        title="Безопасный остаток"
        amount="12 500 ₽"
        label="Доступно для свободных трат"
        state="positive"
        :selected="selectedCard === 'Безопасный остаток'"
        @select="selectCard('Безопасный остаток')"
      />

      <BudgetCard
        title="Обязательные расходы"
        amount="39 000 ₽"
        label="Осталось зарезервировано"
        state="warning"
        :selected="selectedCard === 'Обязательные расходы'"
        @select="selectCard('Обязательные расходы')"
      />
    </div>

    <p v-if="selectedCard" class="selection-result">Выбрано: {{ selectedCard }}</p>
  </section>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  line-height: 1.4;
}

p {
  margin: calc(var(--space-2) + var(--space-1)) 0 0;
  line-height: 1.5;
}

.budget-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.selection-result {
  font-weight: 600;
}
</style>
