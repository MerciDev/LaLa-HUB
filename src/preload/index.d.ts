import { AppAction } from '../shared/types'

export interface API {
  onMainMessage: (callback: (action: AppAction) => void) => void
  offMainMessage: () => void
  mainOptionControl: (actionId: string) => void
}

declare global {
  interface Window {
    api: API
  }
}
