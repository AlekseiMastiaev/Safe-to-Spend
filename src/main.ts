import '@/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { db } from './shared/db/database'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

void db.open().catch((error: unknown) => {
  console.error('Не удалось открыть локальную базу данных', error)
})
