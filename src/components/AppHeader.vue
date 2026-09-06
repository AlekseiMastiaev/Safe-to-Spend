<script setup lang="ts">
const props = defineProps<{
  title: string
}>()
</script>

<template>
  <header class="app-header">
    <h1>{{ props.title }}</h1>
  </header>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--color-border);
}

h1 {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-4);
  font-size: var(--font-size-xl);
  line-height: 1.3;
  overflow-wrap: anywhere;
}
</style>
