import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/views/DashboardPage.vue'
import ExpensesPage from '@/views/ExpensesPage.vue'
import HistoryPage from '@/views/HistoryPage.vue'
import IncomesPage from '@/views/IncomesPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'
import OnboardingPage from '@/views/OnboardingPage.vue'
import ObligationsPage from '@/views/ObligationsPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import { parseMonthKey } from '@/domain/month'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

declare module 'vue-router' {
  interface RouteMeta {
    title: string
  }
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/onboarding',
      name: APP_ROUTE_NAMES.onboarding,
      component: OnboardingPage,
      meta: { title: 'Первый запуск' },
    },
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
      path: '/history/:monthKey?',
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

router.beforeEach((to) => {
  if (to.name !== APP_ROUTE_NAMES.history) return

  const monthKey = to.params.monthKey
  if (monthKey === undefined || monthKey === '') return

  if (parseMonthKey(monthKey) === null) {
    return { name: APP_ROUTE_NAMES.history, replace: true }
  }
})

router.afterEach((to, _from, failure) => {
  if (failure) return

  document.title = `${to.meta.title} — Safe to Spend`

  if (to.name === APP_ROUTE_NAMES.history) {
    const monthKey = parseMonthKey(to.params.monthKey)
    if (monthKey !== null) useSelectedMonthStore().setSelectedMonthKey(monthKey)
  }
})

export default router
