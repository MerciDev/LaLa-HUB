import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import AdmZip from 'adm-zip'
import { debugLog, debugError } from '../utils/debug'
import { app } from 'electron'

const EMULATORS_DIR = path.join(app.getPath('userData'), 'emulators')

export function registerAppInstallHandlers(): void {
    ipcMain.handle('install-app', async (event, url: string, appName: string) => {
        debugLog(`[InstallApp] Starting auto-installation for ${appName} from ${url}`)
        
        try {
            // Ensure emulators directory exists
            if (!fs.existsSync(EMULATORS_DIR)) {
                fs.mkdirSync(EMULATORS_DIR, { recursive: true })
            }

            const safeAppName = appName.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase()
            const extractDir = path.join(EMULATORS_DIR, safeAppName)
            const is7z = url.toLowerCase().endsWith('.7z')
            const ext = is7z ? '.7z' : '.zip'
            const tmpFilePath = path.join(os.tmpdir(), `lala-install-${safeAppName}-${Date.now()}${ext}`)

            // 1. Download the file
            debugLog(`[InstallApp] Downloading ${url} to ${tmpFilePath}`)
            
            // Notify frontend that download started
            event.sender.send('install-app-progress', { status: 'downloading', appName })
            
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
            }

            const buffer = await response.arrayBuffer()
            fs.writeFileSync(tmpFilePath, Buffer.from(buffer))

            debugLog(`[InstallApp] Download complete. Extracting to ${extractDir}`)
            event.sender.send('install-app-progress', { status: 'extracting', appName })

            // 2. Extract the file
            // Remove old dir if exists
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true })
            }
            fs.mkdirSync(extractDir, { recursive: true })

            if (is7z) {
                const sevenBin = require('7zip-bin')
                const Seven = require('node-7z')
                const pathTo7zip = sevenBin.path7za
                
                await new Promise((resolve, reject) => {
                    const stream = Seven.extractFull(tmpFilePath, extractDir, {
                        $bin: pathTo7zip
                    })
                    stream.on('end', resolve)
                    stream.on('error', reject)
                })
            } else {
                const zip = new AdmZip(tmpFilePath)
                zip.extractAllTo(extractDir, true)
            }

            // Cleanup temp file
            try { fs.unlinkSync(tmpFilePath) } catch (e) { /* ignore */ }

            debugLog(`[InstallApp] Extraction complete. Finding executable...`)
            event.sender.send('install-app-progress', { status: 'configuring', appName })

            // 3. Find the primary .exe file
            // We search recursively. We prioritize files matching the app name, or typical emulator names.
            const exes = findExecutables(extractDir)
            if (exes.length === 0) {
                throw new Error('No .exe files found in the downloaded package.')
            }

            // Simple heuristic to find the best .exe
            let selectedExe = exes[0]
            for (const exe of exes) {
                const lowerName = path.basename(exe).toLowerCase()
                if (lowerName.includes(safeAppName) || lowerName.includes(appName.toLowerCase())) {
                    selectedExe = exe
                    // If it specifically contains 'qt' or similar (like pcsx2-qt), prefer it
                    if (lowerName.includes('qt')) {
                        selectedExe = exe
                        break
                    }
                }
            }

            debugLog(`[InstallApp] Installation successful! Executable found: ${selectedExe}`)
            return { success: true, executablePath: selectedExe }

        } catch (error: any) {
            debugError(`[InstallApp] Installation failed: ${error.message || String(error)}`)
            return { success: false, error: error.message || String(error) }
        }
    })
}

function findExecutables(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            findExecutables(fullPath, fileList)
        } else if (file.toLowerCase().endsWith('.exe')) {
            // Ignore common uninstaller names
            if (!file.toLowerCase().includes('uninstall') && !file.toLowerCase().includes('uninst')) {
                fileList.push(fullPath)
            }
        }
    }
    return fileList
}
