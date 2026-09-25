import type { AppSettings, IsoDateTime } from './models'

export function createDefaultSettings(timestamp: IsoDateTime): AppSettings {
  return {
    id: 'app-settings',
    currency: 'RUB',
    locale: 'ru-RU',
    colorScheme: 'system',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
