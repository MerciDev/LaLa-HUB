const fs = require('fs')
const path = require('path')

const fileChanges = [
    {
        file: 'src/main/handlers/retroarchHandler.ts',
        replace: [{ from: "import path from 'path'\n", to: '' }]
    },
    {
        file: 'src/main/handlers/scannerHandler.ts',
        replace: [{ from: "'../shared/types'", to: "'../../shared/types'" }]
    },
    {
        file: 'src/main/handlers/slotHandler.ts',
        replace: [{ from: "import { upsertRecords, deleteRemoteRecord }", to: "import { deleteRemoteRecord }" }]
    },
    {
        file: 'src/main/index.ts',
        replace: [
            { from: "import { initDiscordRPC, setActivity }", to: "import { initDiscordRPC }" },
            { from: "const { net } = await import('electron')", to: "await import('electron')" }
        ]
    },
    {
        file: 'src/main/utils/gameApi.ts',
        replace: [
            { from: "function getLocalApiGamesDir()", to: "// @ts-ignore\nfunction getLocalApiGamesDir()" },
            { from: "import { debugLog } from './debug'", to: "import { debugLog, debugError } from './debug'" }
        ]
    },
    {
        file: 'src/main/utils/joyToKey.ts',
        replace: [
            { from: "const BUTTON_MAP:", to: "export const BUTTON_MAP:" },
            { from: "function formatJ2JAction", to: "export function formatJ2JAction" }
        ]
    },
    {
        file: 'src/main/utils/scanner.ts',
        replace: [{ from: "'../shared/types'", to: "'../../shared/types'" }]
    },
    {
        file: 'src/main/utils/storage.ts',
        replace: [{ from: "image: hImg || vImg || sqImg,", to: "" }]
    },
    {
        file: 'src/main/utils/supabaseData.ts',
        replace: [
            { from: "import { getAuthenticatedClient, getUserId, getSupabaseClient }", to: "import { getAuthenticatedClient, getUserId }" },
            { from: "import { debugLog, debugError }", to: "import { debugError }" }
        ]
    },
    {
        file: 'src/main/utils/syncEngine.ts',
        replace: [{ from: "import { USER_DATA_PATH, loadSlots }", to: "import { USER_DATA_PATH }" }]
    },
    {
        file: 'src/main/utils/windowManager.ts',
        replace: [{ from: "(error, stdout)", to: "(_error, stdout)" }]
    },
    {
        file: 'src/main/windows/main/main.ts',
        replace: [
            { from: "import { showLoading, hideLoading, toggleLoading }", to: "import { showLoading, hideLoading }" },
            { from: "function parseArgs(input: string)", to: "// @ts-ignore\nfunction parseArgs(input: string)" }
        ]
    }
]

for (const change of fileChanges) {
    const filePath = path.join(__dirname, change.file)
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8')
        for (const rep of change.replace) {
            content = content.replace(rep.from, rep.to)
        }
        fs.writeFileSync(filePath, content)
        console.log(`Updated ${change.file}`)
    } else {
        console.log(`Not found: ${change.file}`)
    }
}
