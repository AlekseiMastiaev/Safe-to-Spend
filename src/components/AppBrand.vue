<script setup lang="ts">
withDefaults(
  defineProps<{
    name?: string
    size?: 'small' | 'medium' | 'large'
  }>(),
  {
    name: 'Safe to Spend',
    size: 'medium',
  },
)

const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`
</script>

<template>
  <span class="app-brand" :class="`app-brand--${size}`">
    <img :src="logoUrl" alt="" />
    <span>{{ name }}</span>
  </span>
</template>

<style scoped>
.app-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  line-height: 1.2;
}

.app-brand img {
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
}

.app-brand--small img {
  width: 1.5rem;
  height: 1.5rem;
}

.app-brand--large {
  gap: var(--space-3);
  font-size: var(--font-size-xl);
}

.app-brand--large img {
  width: 3rem;
  height: 3rem;
}
</style>
