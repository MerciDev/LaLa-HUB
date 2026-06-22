import { ipcMain } from 'electron'
import { fetchConsoles, fetchYears, searchGames, getGameById, searchAllGames } from '../utils/gameApi'

export function registerGameApiHandlers(): void {
  ipcMain.handle('gameapi-consoles', async () => {
    return await fetchConsoles()
  })

  ipcMain.handle('gameapi-years', async () => {
    return await fetchYears()
  })

  ipcMain.handle('gameapi-search', async (_, query: string) => {
    if (!query || !query.trim()) {
      return await searchAllGames()
    }
    return await searchGames(query)
  })

  ipcMain.handle('gameapi-get-by-id', async (_, id: string) => {
    return await getGameById(id)
  })
}
