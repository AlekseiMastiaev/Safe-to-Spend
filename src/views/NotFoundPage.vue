<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="not-found-title">
    <h2 id="not-found-title">Страница не найдена</h2>
    <p>Такого адреса в приложении нет.</p>
    <RouterLink :to="{ name: 'dashboard' }">Вернуться на главную</RouterLink>
  </section>
</template>
