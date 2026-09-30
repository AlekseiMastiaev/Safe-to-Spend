<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const email = ref('')
const isSending = ref(false)
const isOpeningGitHub = ref(false)
const linkSent = ref(false)

async function signInWithGitHub(): Promise<void> {
  if (isOpeningGitHub.value) return
  isOpeningGitHub.value = true
  try {
    await auth.signInWithGitHub()
  } catch {
    isOpeningGitHub.value = false
  }
}

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
      <p>Войдите через GitHub или получите одноразовую ссылку на email.</p>

      <button
        class="button auth-page__github"
        type="button"
        :disabled="isOpeningGitHub"
        @click="signInWithGitHub"
      >
        {{ isOpeningGitHub ? 'Открываем GitHub…' : 'Войти через GitHub' }}
      </button>

      <div class="auth-page__separator"><span>или</span></div>

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

.auth-page__github {
  width: 100%;
  margin-top: var(--space-3);
}

.auth-page__separator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-4) 0;
  color: var(--color-muted);
}

.auth-page__separator::before,
.auth-page__separator::after {
  flex: 1;
  border-top: 1px solid var(--color-border);
  content: '';
}
</style>
