import { contextBridge, ipcRenderer } from 'electron'
import { AppAction, HomeSlot } from '../shared/types'

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

  gridItemControl: (actionId: string, item: HomeSlot) => {
    ipcRenderer.send('grid-item-control', actionId, item)
  },

  movementControl: {
    send: (action: string, data?: any) => {
      ipcRenderer.send('movement-control', action, data)
    },
    onAction: (callback: (section: string, action: string) => void) => {
      const subscription = (_, section, action) => callback(section, action)
      ipcRenderer.on('movement-action', subscription)
      return () => {
        ipcRenderer.removeListener('movement-action', subscription)
      }
    }
  },

  contextMenuControl: {
    send: (action: string, data?: any) => {
      ipcRenderer.send('context-menu-control', action, data)
    },
    onAction: (callback: (action: string, data?: any) => void) => {
      const subscription = (_, action, data) => callback(action, data)
      ipcRenderer.on('context-menu-action', subscription)
      return () => {
        ipcRenderer.removeListener('context-menu-action', subscription)
      }
    }
  }
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
