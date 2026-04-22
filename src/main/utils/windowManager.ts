import { exec } from 'child_process'
import { debugLog } from './debug'

/**
 * Attempts to activate a window by title and send keys to it.
 * Retries for a specified duration until the window is found and activated.
 * 
 * @param windowTitle The title of the window to activate.
 * @param keys The keys to send using WScript.Shell.SendKeys.
 * @param maxAttempts Maximum number of retry attempts.
 * @param intervalMs Delay between attempts in milliseconds.
 */
export function focusWindowAndSendKeys(
    windowTitle: string,
    keys: string,
    maxAttempts: number = 20,
    intervalMs: number = 1000,
    onComplete?: (success: boolean) => void,
    pid?: number
): void {
    let attempts = 0

    const tryFocus = (): void => {
        attempts++
        debugLog(`[WindowManager] Attempt ${attempts}: Searching for window "${windowTitle}"...`)

        // PowerShell script to try and activate the window. 
        // AppActivate returns True if found and focused, False otherwise.
        const safeTitle = windowTitle.replace(/'/g, "''")
        const safeKeys = keys.replace(/'/g, "''")

        const psCommand = `
            $wsh = New-Object -ComObject WScript.Shell;
            $activated = $false;
            if ('${pid}' -ne '') {
                $activated = $wsh.AppActivate(${pid});
            }
            if (-not $activated) {
                $activated = $wsh.AppActivate('${safeTitle}');
            }

            if ($activated) {
                Start-Sleep -Milliseconds 200;
                $wsh.SendKeys('${safeKeys}');
                Write-Output "SUCCESS";
            } else {
                Write-Output "FAILED";
            }
        `

        exec(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, (error, stdout) => {
            if (error) {
                console.error(`[WindowManager] PowerShell error:`, error)
                return
            }

            const result = stdout.trim()
            if (result === 'SUCCESS') {
                debugLog(`[WindowManager] Successfully focused "${windowTitle}" and sent keys.`)
                if (onComplete) onComplete(true)
            } else if (attempts < maxAttempts) {
                // Not found yet, schedule next attempt
                setTimeout(tryFocus, intervalMs)
            } else {
                debugLog(`[WindowManager] Failed to find window "${windowTitle}" after ${maxAttempts} attempts.`)
                if (onComplete) onComplete(false)
            }
        })
    }

    // Start polling
    tryFocus()
}
