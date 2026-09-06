<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const selectedMonth = computed(() => {
  const monthId = route.params.monthId

  return typeof monthId === 'string' ? monthId : null
})
</script>

<template>
  <section aria-labelledby="history-title">
    <h2 id="history-title">История</h2>
    <p v-if="selectedMonth">Выбранный месяц: {{ selectedMonth }}</p>
    <p v-else>Здесь появится история завершённых месяцев.</p>
  </section>
</template>
