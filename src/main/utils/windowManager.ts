import { exec } from 'child_process'
import { debugLog } from './debug'

/**
 * Attempts to detect when a newly launched game window appears in the foreground,
 * then calls onComplete(true).
 *
 * @param windowTitle Hint name used for Windows + debug logs.
 * @param keys Keys to send after focusing (Windows only).
 * @param maxAttempts Maximum polling attempts before giving up.
 * @param intervalMs Milliseconds between attempts.
 * @param onComplete Called with true on success, false on timeout.
 * @param pid Optional PID hint (Windows).
 * @param processNameOverride Optional: if provided, macOS will search for THIS process instead of just frontmost.
 */
export function focusWindowAndSendKeys(
    windowTitle: string,
    keys: string,
    maxAttempts: number = 20,
    intervalMs: number = 1000,
    onComplete?: (success: boolean) => void,
    pid?: number,
    processNameOverride?: string
): void {
    let attempts = 0

    const tryFocus = (): void => {
        attempts++
        debugLog(`[WindowManager] Attempt ${attempts}/${maxAttempts}: waiting for game window...`)

        if (process.platform === 'win32') {
            // ── Windows: focus by PID or title ──────────────────────────────────
            const target = processNameOverride || windowTitle
            const safeTitle = target.replace(/'/g, "''")
            const safeKeys = keys.replace(/'/g, "''")
            const psCommand = `
                $wsh = New-Object -ComObject WScript.Shell;
                $activated = $false;
                if ('${pid}' -ne '') { $activated = $wsh.AppActivate(${pid}); }
                if (-not $activated) { $activated = $wsh.AppActivate('${safeTitle}'); }
                if ($activated) {
                    Start-Sleep -Milliseconds 200;
                    $wsh.SendKeys('${safeKeys}');
                    Write-Output "SUCCESS";
                } else { Write-Output "FAILED"; }
            `
            exec(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, (_error, stdout) => {
                const result = stdout?.trim()
                if (result === 'SUCCESS') {
                    debugLog(`[WindowManager] Focused "${target}" (Win).`)
                    if (onComplete) onComplete(true)
                } else if (attempts < maxAttempts) {
                    setTimeout(tryFocus, intervalMs)
                } else {
                    if (onComplete) onComplete(false)
                }
            })

        } else if (process.platform === 'darwin') {
            // ── macOS Detection Strategy ─────────────────────────────────────────
            //
            // 1. If processNameOverride is provided:
            //    Search for ANY window belonging to a process matching that name.
            //
            // 2. Otherwise:
            //    Find the frontmost app. If it's NOT us and has a window, SUCCESS.
            
            const appleScript = processNameOverride 
                ? [
                    'tell application "System Events"',
                    '    try',
                    `        set matchedProcs to every application process whose name contains "${processNameOverride}"`,
                    '        if (count of matchedProcs) > 0 then',
                    '            repeat with proc in matchedProcs',
                    '                if (count of (every window of proc)) > 0 then',
                    '                    set frontmost of proc to true',
                    `                    return name of proc & "|1"`,
                    '                end if',
                    '            end repeat',
                    '        end if',
                    '        return "WAITING|0"',
                    '    on error err',
                    '        return "ERROR:" & err',
                    '    end try',
                    'end tell'
                ].join('\n')
                : [
                    'tell application "System Events"',
                    '    try',
                    '        set frontProc to first application process whose frontmost is true',
                    '        set frontName to name of frontProc',
                    '        set winCount to count of (every window of frontProc)',
                    '        return frontName & "|" & winCount',
                    '    on error err',
                    '        return "ERROR:" & err',
                    '    end try',
                    'end tell',
                ].join('\n')

            exec(`osascript << 'APPLESCRIPT'\n${appleScript}\nAPPLESCRIPT`, (error, stdout, stderr) => {
                if (error) {
                    debugLog(`[WindowManager] Osascript execution error: ${stderr?.trim() || error.message}`)
                    if (attempts < maxAttempts) {
                        setTimeout(tryFocus, intervalMs)
                    } else {
                        if (onComplete) onComplete(false)
                    }
                    return
                }

                const result = stdout?.trim()
                if (result.startsWith("ERROR:")) {
                    debugLog(`[WindowManager] AppleScript internal error: ${result}`)
                    if (attempts < maxAttempts) {
                        setTimeout(tryFocus, intervalMs)
                    } else {
                        if (onComplete) onComplete(false)
                    }
                    return
                }

                const [frontName, winCountStr] = result.split('|')
                const winCount = parseInt(winCountStr) || 0

                if (processNameOverride) {
                    if (winCount > 0) {
                        debugLog(`[WindowManager] Targeted process "${frontName}" found with windows — SUCCESS.`)
                        if (onComplete) onComplete(true)
                    } else {
                        debugLog(`[WindowManager] Waiting for targeted process "${processNameOverride}"...`)
                        if (attempts < maxAttempts) {
                            setTimeout(tryFocus, intervalMs)
                        } else {
                            if (onComplete) onComplete(false)
                        }
                    }
                } else {
                    debugLog(`[WindowManager] Current Frontmost: "${frontName}" | Windows: ${winCount}`)
                    // Success condition: Frontmost is not us AND has at least one window
                    const isUs = frontName === "Electron" || frontName === "LaLa" || frontName === "LaLa-HUB"
                    if (!isUs && winCount > 0) {
                        debugLog(`[WindowManager] New window detected: "${frontName}" — SUCCESS.`)
                        if (onComplete) onComplete(true)
                    } else if (attempts < maxAttempts) {
                        setTimeout(tryFocus, intervalMs)
                    } else {
                        debugLog(`[WindowManager] Timed out waiting for game window.`)
                        if (onComplete) onComplete(false)
                    }
                }
            })

        } else {
            // Linux: not implemented, assume success so the flow continues
            debugLog(`[WindowManager] Focus not implemented for ${process.platform}`)
            if (onComplete) onComplete(true)
        }
    }

    tryFocus()
}
