import { AppAction } from '../shared/types'

export interface API {
  onMainMessage: (callback: (action: AppAction) => void) => void
  offMainMessage: () => void
  mainOptionControl: (actionId: string) => void
  gridItemControl: (actionId: string, item: HomeSlot) => void
  movementControl: {
    send: (action: string, data?: any) => void
    onAction: (callback: (section: string, action: string) => void) => () => void
  }
}

declare global {
  interface Window {
    api: API
  }
}
