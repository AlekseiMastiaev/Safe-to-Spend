export const APP_ROUTE_NAMES = {
  dashboard: 'dashboard',
  incomes: 'incomes',
  obligations: 'obligations',
  expenses: 'expenses',
  history: 'history',
  settings: 'settings',
} as const

export type AppRouteName = (typeof APP_ROUTE_NAMES)[keyof typeof APP_ROUTE_NAMES]

export interface NavigationItem {
  label: string
  shortLabel: string
  routeName: AppRouteName
}

export const navigationItems = [
  {
    label: 'Главная',
    shortLabel: 'Главная',
    routeName: APP_ROUTE_NAMES.dashboard,
  },
  {
    label: 'Доходы',
    shortLabel: 'Доходы',
    routeName: APP_ROUTE_NAMES.incomes,
  },
  {
    label: 'Обязательные расходы',
    shortLabel: 'Обяз.',
    routeName: APP_ROUTE_NAMES.obligations,
  },
  {
    label: 'Свободные расходы',
    shortLabel: 'Расходы',
    routeName: APP_ROUTE_NAMES.expenses,
  },
  {
    label: 'История',
    shortLabel: 'История',
    routeName: APP_ROUTE_NAMES.history,
  },
  {
    label: 'Настройки',
    shortLabel: 'Настр.',
    routeName: APP_ROUTE_NAMES.settings,
  },
] as const satisfies readonly NavigationItem[]
