import { onMounted, onScopeDispose } from 'vue'
import { invalidateData } from './useDataQuery'

/** Browser timers may pause in the background, so resume also checks the calendar. */
export function useCalendarRefresh(enabled: () => boolean): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  function refresh(): void {
    if (enabled() && document.visibilityState === 'visible') invalidateData()
  }
  function scheduleMidnight(): void {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 25)
    timer = setTimeout(() => {
      refresh()
      scheduleMidnight()
    }, midnight.getTime() - now.getTime())
  }
  onMounted(() => {
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    scheduleMidnight()
  })
  onScopeDispose(() => {
    if (timer !== null) clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('pageshow', refresh)
  })
}
