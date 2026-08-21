<template>
  <section class="start-screen" aria-labelledby="app-title">
    <h1 id="app-title">Safe to Spend</h1>
  </section>
</template>

<style scoped>
.start-screen {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 1.5rem;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 4rem);
  line-height: 1.1;
}
</style>
