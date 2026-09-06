import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/views/DashboardPage.vue'
import ExpensesPage from '@/views/ExpensesPage.vue'
import HistoryPage from '@/views/HistoryPage.vue'
import IncomesPage from '@/views/IncomesPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'
import ObligationsPage from '@/views/ObligationsPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import { APP_ROUTE_NAMES } from '@/router/navigation'

declare module 'vue-router' {
  interface RouteMeta {
    title: string
  }
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: APP_ROUTE_NAMES.dashboard,
      component: DashboardPage,
      meta: { title: 'Главная' },
    },
    {
      path: '/incomes',
      name: APP_ROUTE_NAMES.incomes,
      component: IncomesPage,
      meta: { title: 'Доходы' },
    },
    {
      path: '/obligations',
      name: APP_ROUTE_NAMES.obligations,
      component: ObligationsPage,
      meta: { title: 'Обязательные расходы' },
    },
    {
      path: '/expenses',
      name: APP_ROUTE_NAMES.expenses,
      component: ExpensesPage,
      meta: { title: 'Свободные расходы' },
    },
    {
      path: '/history/:monthId?',
      name: APP_ROUTE_NAMES.history,
      component: HistoryPage,
      meta: { title: 'История' },
    },
    {
      path: '/settings',
      name: APP_ROUTE_NAMES.settings,
      component: SettingsPage,
      meta: { title: 'Настройки' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
      meta: { title: 'Страница не найдена' },
    },
  ],
})

router.afterEach((to) => {
  document.title = `${to.meta.title} — Safe to Spend`
})

export default router
