<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const email = ref('')
const isSending = ref(false)
const linkSent = ref(false)

async function sendLink(): Promise<void> {
  if (isSending.value) return
  isSending.value = true
  linkSent.value = false
  try {
    await auth.sendMagicLink(email.value.trim())
    linkSent.value = true
  } catch {
    // The store exposes a safe user-facing error below.
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="panel auth-page__panel" aria-labelledby="auth-title">
      <p class="auth-page__brand">Safe to Spend</p>
      <h1 id="auth-title">Вход в облачный бюджет</h1>
      <p>Введите email. Мы отправим одноразовую ссылку для входа без пароля.</p>

      <form class="form-grid" @submit.prevent="sendLink">
        <label class="field">
          <span>Email</span>
          <input
            v-model="email"
            required
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>
        <p v-if="auth.error" class="form-error" role="alert">{{ auth.error }}</p>
        <p v-if="linkSent" class="auth-page__success" role="status">
          Ссылка отправлена. Откройте её на этом устройстве, чтобы войти.
        </p>
        <button class="button" type="submit" :disabled="isSending">
          {{ isSending ? 'Отправляем…' : 'Получить ссылку для входа' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: var(--space-4);
}

.auth-page__panel {
  width: min(100%, 30rem);
}

.auth-page__brand {
  color: var(--color-muted);
  font-weight: 700;
}

h1 {
  margin: var(--space-2) 0;
  font-size: var(--font-size-xl);
}

.auth-page__success {
  color: var(--color-positive);
}
</style>
