import { exec, ChildProcess } from 'child_process'
import { debugLog } from './debug'

/**
 * Background gamepad poller running in the Main process via PowerShell + XInput.
 *
 * Unlike the Web Gamepad API (renderer-side), this poller works regardless of
 * which window has focus — it reads controller state directly from the OS.
 *
 * Usage:
 *   const poller = createMainProcessGamepadPoller(onButton)
 *   poller.start()
 *   poller.stop()
 *
 * onButton is called with the button combo string (e.g. 'RS+Select') whenever
 * the combo is held.
 */

// XInput button bitmask constants (XINPUT_GAMEPAD_*)
// https://learn.microsoft.com/en-us/windows/win32/api/xinput/ns-xinput-xinput_gamepad
const XINPUT_BUTTONS = {
  DPAD_UP: 0x0001,
  DPAD_DOWN: 0x0002,
  DPAD_LEFT: 0x0004,
  DPAD_RIGHT: 0x0008,
  START: 0x0010,
  BACK: 0x0020,        // "Select" / "View"
  LEFT_THUMB: 0x0040,  // L3 / Left Stick click
  RIGHT_THUMB: 0x0080, // R3 / Right Stick click (RS)
  LEFT_SHOULDER: 0x0100,
  RIGHT_SHOULDER: 0x0200,
  A: 0x1000,
  B: 0x2000,
  X: 0x4000,
  Y: 0x8000,
}

export type GamepadComboCallback = (combo: string) => void

/**
 * Builds a PowerShell script that continuously polls all connected XInput
 * controllers and writes pressed-button combos to stdout.
 *
 * The script checks for RS+Select and individual buttons, writing one line
 * per detected combo before sleeping 100ms.
 */
function buildPollerScript(pollMs: number): string {
  return `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct XINPUT_GAMEPAD {
  public ushort wButtons;
  public byte bLeftTrigger;
  public byte bRightTrigger;
  public short sThumbLX;
  public short sThumbLY;
  public short sThumbRX;
  public short sThumbRY;
}

[StructLayout(LayoutKind.Sequential)]
public struct XINPUT_STATE {
  public uint dwPacketNumber;
  public XINPUT_GAMEPAD Gamepad;
}

public class XInput {
  [DllImport("xinput1_4.dll")]
  public static extern int XInputGetState(int dwUserIndex, ref XINPUT_STATE pState);
}
"@

$RS     = 0x0080
$Select = 0x0020
$L3     = 0x0040

$prev = @{}

while ($true) {
  for ($i = 0; $i -lt 4; $i++) {
    $state = New-Object XINPUT_STATE
    $ret = [XInput]::XInputGetState($i, [ref]$state)
    if ($ret -ne 0) { continue }
    $b = $state.Gamepad.wButtons

    $key = "gp$i"
    if (-not $prev.ContainsKey($key)) { $prev[$key] = 0 }
    $prevB = $prev[$key]
    $prev[$key] = $b

    # Only fire on new press (edge detection — was not pressed before)
    $newPress = ($b -band (-bnot $prevB))

    if (($b -band $RS) -and ($b -band $Select) -and ($newPress -band ($RS -bor $Select))) {
      Write-Output "COMBO:RS+Select"
    }
    if (($newPress -band $L3) -and ($b -band $RS)) {
      Write-Output "COMBO:L3R3"
    }
  }
  Start-Sleep -Milliseconds ${pollMs}
}
`
}

export interface MainGamepadPoller {
  start(): void
  stop(): void
  isRunning(): boolean
}

/**
 * Creates a main-process gamepad poller.
 * @param onCombo  Called with the combo string ('RS+Select', 'L3R3') when detected.
 * @param pollMs   Polling interval in ms (default 100ms).
 */
export function createMainProcessGamepadPoller(
  onCombo: GamepadComboCallback,
  pollMs: number = 100
): MainGamepadPoller {
  let proc: ChildProcess | null = null
  let running = false

  return {
    isRunning: () => running,

    start() {
      if (running || process.platform !== 'win32') return
      running = true

      const script = buildPollerScript(pollMs)
      // Run PowerShell with the inline script via stdin to avoid temp files
      proc = exec(
        `powershell -NoProfile -NonInteractive -Command -`,
        { windowsHide: true },
        (_err) => {
          running = false
          proc = null
        }
      )

      if (!proc || !proc.stdin || !proc.stdout) {
        running = false
        return
      }

      proc.stdin.write(script)
      proc.stdin.end()

      proc.stdout.setEncoding('utf8')
      proc.stdout.on('data', (chunk: string) => {
        const lines = chunk.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('COMBO:')) {
            const combo = trimmed.slice('COMBO:'.length)
            debugLog(`[GamepadPoller] Combo detected: ${combo}`)
            onCombo(combo)
          }
        }
      })

      proc.stderr?.setEncoding('utf8')
      proc.stderr?.on('data', (chunk: string) => {
        const msg = chunk.trim()
        if (msg) debugLog(`[GamepadPoller] stderr: ${msg}`)
      })

      proc.on('exit', () => {
        running = false
        proc = null
        debugLog('[GamepadPoller] Poller process exited.')
      })

      debugLog(`[GamepadPoller] Started (polling every ${pollMs}ms).`)
    },

    stop() {
      if (!running || !proc) return
      running = false
      try {
        proc.kill()
      } catch { /* ignore */ }
      proc = null
      debugLog('[GamepadPoller] Stopped.')
    }
  }
}
