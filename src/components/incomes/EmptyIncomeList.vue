<template>
  <div class="empty-income-list">
    <h3>Доходов пока нет</h3>
    <p>Когда вы добавите первый доход, он появится здесь.</p>
  </div>
</template>

<style scoped>
.empty-income-list {
  padding: var(--space-4);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 1rem;
}

p {
  margin-top: var(--space-2);
  color: var(--color-muted);
  line-height: 1.5;
}
</style>
