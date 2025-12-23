import { contextBridge, ipcRenderer } from 'electron'
import { AppAction } from '../shared/types'

// Custom APIs for renderer
const api = {
  onMainMessage: (callback: (action: AppAction) => void) => {
    ipcRenderer.on('dispatch-action', (_, action) => callback(action))
  },

  offMainMessage: () => {
    ipcRenderer.removeAllListeners('dispatch-action')
  },

  mainOptionControl: (actionId: string) => {
    ipcRenderer.send('main-option-control', actionId)
  },
}

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
