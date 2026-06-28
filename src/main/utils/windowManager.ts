import { exec } from 'child_process'
import { debugLog } from './debug'

/**
 * Waits until the launched game process has a visible window, then calls onComplete(true).
 *
 * On Windows: two-phase detection —
 *   Phase 1: process appears in the OS process list (Get-Process by name/PID).
 *   Phase 2: process.MainWindowHandle != 0 (window is actually rendered on screen).
 *   This avoids closing the loading screen too early (process exists but no window yet).
 *
 * On macOS: polls with osascript / System Events to detect a new frontmost window.
 *
 * @param windowTitle          Hint name for macOS detection and Windows fallback.
 * @param keys                 Keys to send after focusing (unused on Windows).
 * @param maxAttempts          Maximum polling attempts before giving up.
 * @param intervalMs           Milliseconds between attempts.
 * @param onComplete           Called with true on success, false on timeout.
 * @param pid                  PID of the spawned process (child-search seed on Windows).
 * @param processNameOverride  Exe name (no .exe) to search on Windows, or process
 *                             name to target on macOS.
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
            // ── Windows: two-phase detection ────────────────────────────────────
            // We need the game process to both exist AND have a visible window.
            // MainWindowHandle is 0 while the process is initializing (black screen /
            // splash), and becomes non-zero once the main window is created.
            const safePid = pid ? String(pid) : ''

            const procName = (processNameOverride || '')
                .replace(/\.exe$/i, '')
                .replace(/'/g, '')
                || windowTitle.replace(/\s+/g, '*').replace(/'/g, '')

            const psLines = [
                `$found = $null`,
                // 1. Search by process name wildcard
                `$procs = Get-Process -Name '*${procName}*' -ErrorAction SilentlyContinue`,
                `if ($procs) { $found = $procs | Select-Object -First 1 }`,
                // 2. Child-process fallback (handles intermediate launchers)
                `if (-not $found -and '${safePid}' -ne '') {`,
                `  try {`,
                `    $kids = Get-CimInstance Win32_Process -Filter "ParentProcessId=${safePid}" -ErrorAction SilentlyContinue`,
                `    foreach ($k in $kids) {`,
                `      $kp = Get-Process -Id $k.ProcessId -ErrorAction SilentlyContinue`,
                `      if ($kp -and $kp.Name -notlike 'conhost' -and $kp.Name -notlike 'cmd') { $found = $kp; break }`,
                `    }`,
                `  } catch {}`,
                `}`,
                // Phase 2: check MainWindowHandle — non-zero means window is visible
                `if ($found) {`,
                `  if ($found.MainWindowHandle -ne 0) {`,
                `    Write-Output "FOUND:$($found.Id):$($found.Name)"`,
                `  } else {`,
                `    Write-Output "WAITING:$($found.Id):$($found.Name)"`,
                `  }`,
                `} else {`,
                `  Write-Output 'NOT_FOUND'`,
                `}`
            ]

            exec(`powershell -NoProfile -Command "${psLines.join('; ')}"`, (_error, stdout) => {
                const result = (stdout ?? '').trim()

                if (result.startsWith('FOUND:')) {
                    const [, foundPid, foundName] = result.split(':')
                    debugLog(`[WindowManager] "${foundName}" has a visible window (PID ${foundPid}) — bringing to front.`)
                    // Bring the game window to the foreground automatically
                    const activateCmd = `$wsh = New-Object -ComObject WScript.Shell; $wsh.AppActivate([int]${foundPid})`
                    exec(`powershell -NoProfile -Command "${activateCmd}"`, () => {
                        if (onComplete) onComplete(true)
                    })

                } else if (result.startsWith('WAITING:')) {
                    const [, , foundName] = result.split(':')
                    debugLog(`[WindowManager] "${foundName}" is running but window not visible yet...`)
                    if (attempts < maxAttempts) {
                        setTimeout(tryFocus, intervalMs)
                    } else {
                        if (onComplete) onComplete(false)
                    }

                } else {
                    // NOT_FOUND
                    if (attempts < maxAttempts) {
                        setTimeout(tryFocus, intervalMs)
                    } else {
                        debugLog(`[WindowManager] Process "${procName}" not found after ${maxAttempts} attempts.`)
                        if (onComplete) onComplete(false)

                    }
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
                    // Success condition: frontmost app is not us AND has at least one window
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
