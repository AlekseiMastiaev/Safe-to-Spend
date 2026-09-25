import '@/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initializePersistence } from './shared/persistence'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

void initializePersistence().catch((error: unknown) => {
  console.error('Не удалось открыть хранилище данных', error)
})
