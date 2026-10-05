export const APP_ROUTE_NAMES = {
  onboarding: 'onboarding',
  dashboard: 'dashboard',
  incomes: 'incomes',
  obligations: 'obligations',
  expenses: 'expenses',
  history: 'history',
  settings: 'settings',
} as const

export type AppRouteName = (typeof APP_ROUTE_NAMES)[keyof typeof APP_ROUTE_NAMES]

interface NavigationItemBase {
  label: string
  routeName: AppRouteName
}

type TextNavigationItem = NavigationItemBase & {
  shortLabel: string
  mobileIcon?: never
}

type IconNavigationItem = NavigationItemBase & {
  shortLabel?: never
  mobileIcon: 'settings'
}

export type NavigationItem = TextNavigationItem | IconNavigationItem

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
    mobileIcon: 'settings',
    routeName: APP_ROUTE_NAMES.settings,
  },
] as const satisfies readonly NavigationItem[]
