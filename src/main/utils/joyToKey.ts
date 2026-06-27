import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { exec } from 'child_process'
import { debugLog, debugError } from './debug'
import { keymaps } from '../keymaps/keymaps'

const JOYTOKEY_DIR = path.join(app.getPath('userData'), 'joyToKey')

/**
 * Windows Virtual Key Codes to JoyToKey Hex strings
 */
const VK_MAP: Record<string, string> = {
  'Enter': '0D',
  'Escape': '1B',
  'ArrowUp': '26',
  'ArrowDown': '28',
  'ArrowLeft': '25',
  'ArrowRight': '27',
  'Control': '11',
  'Shift': '10',
  'Alt': '12',
  'Space': '20',
  'Home': '24',
  'Insert': '2D',
  'A': '41',
  'B': '42',
  'C': '43',
  'D': '44',
  'E': '45',
  'F': '46',
  'G': '47',
  'H': '48',
  'I': '49',
  'J': '4A',
  'K': '4B',
  'L': '4C',
  'M': '4D',
  'N': '4E',
  'O': '4F',
  'P': '50',
  'Q': '51',
  'R': '52',
  'S': '53',
  'T': '54',
  'U': '55',
  'V': '56',
  'W': '57',
  'X': '58',
  'Y': '59',
  'Z': '5A',
  // Add more as needed
}

/**
 * Maps our Gamepad labels to JoyToKey Button IDs (Standard XInput mapping)
 */
export const BUTTON_MAP: Record<string, number> = {
  'gamepadA': 1,
  'gamepadB': 2,
  'gamepadX': 3,
  'gamepadY': 4,
  'gamepadLB': 5,
  'gamepadRB': 6,
  'gamepadSelect': 7,
  'gamepadStart': 8,
  'gamepadLeftStick': 9,
  'gamepadRightStick': 10,
  // LT/RT and DPAD are handled differently in J2K (Axes and POV)
}

/**
 * Formats a key combo (e.g. "Control+X") into JoyToKey format: "1, 11:00:00:00, 58:00:00:00, 0, 0"
 */
function formatJ2KAction(keyStr: string): string {
  const parts = keyStr.split('+').map(p => p.trim())
  const hexCodes = parts.map(p => VK_MAP[p] || '00').filter(h => h !== '00')
  
  if (hexCodes.length === 0) return '0'
  
  // JoyToKey format: "1, Key1:00:00:00, Key2:00:00:00, Key3:00:00:00, 0"
  // If only one key: "1, Key1:00:00:00, 0, 0, 0"
  let result = '1'
  for (let i = 0; i < 3; i++) {
    result += `, ${hexCodes[i] || '00'}:00:00:00`
  }
  result += ', 0'
  return result
}

/**
 * Generates a JoyToKey .cfg file content using the user's exact template
 */
export function generateJoyToKeyConfig(): string {
  // Helper to get hex from keymap, supporting multiple options "Key1 | Key2"
  const getHex = (action: string, fallback: string, index: number = 0) => {
    const value = (keymaps as any)[action]
    if (typeof value !== 'string') return fallback
    const options = value.split('|').map(v => v.trim())
    // If we want the first (usually POV/Arrows) or second (usually Stick/WASD)
    const key = options[index] || options[0] || fallback
    return VK_MAP[key] || fallback
  }

  return [
    '[General]',
    'FileVersion=70',
    'NumberOfJoysticks=2',
    'NumberOfButtons=32',
    'DisplayMode=2',
    'UseDiagonalInput=0',
    'UseDiagonalInput2=0',
    'UsePOV8Way=0',
    'RepeatSameKeyInSequence=0',
    'Threshold=20',
    'Threshold2=20',
    'KeySendMode=0',
    'SoundFile=',
    'ImageFile=',
    'VibrationSpeed1=0',
    'VibrationSpeed2=0',
    'VibrationDuration=0',
    '',
    '[Joystick 1]',
    'DefaultDisplayName=',
    'DefaultTemplateId=',
    `Axis1n=1, ${getHex('left', '41', 1)}:00:00:00, 0.000, 0, 0`,  // A (index 1)
    `Axis1p=1, ${getHex('right', '44', 1)}:00:00:00, 0.000, 0, 0`, // D (index 1)
    `Axis2n=1, ${getHex('up', '57', 1)}:00:00:00, 0.000, 0, 0`,    // W (index 1)
    `Axis2p=1, ${getHex('down', '53', 1)}:00:00:00, 0.000, 0, 0`,  // S (index 1)
    `POV1-1=1, ${getHex('up', '26', 0)}:00:00:00, 0.000, 0, 0`,    // ArrowUp (index 0)
    `POV1-3=1, ${getHex('right', '27', 0)}:00:00:00, 0.000, 0, 0`, // ArrowRight (index 0)
    `POV1-5=1, ${getHex('down', '28', 0)}:00:00:00, 0.000, 0, 0`,  // ArrowDown (index 0)
    `POV1-7=1, ${getHex('left', '25', 0)}:00:00:00, 0.000, 0, 0`,   // ArrowLeft (index 0)
    `Axis3n=1, 4A:00:00:00, 0.000, 0, 0`, // J
    `Axis3p=1, 4C:00:00:00, 0.000, 0, 0`, // L
    `Axis4n=1, 49:00:00:00, 0.000, 0, 0`, // I
    `Axis4p=1, 4B:00:00:00, 0.000, 0, 0`, // K
    `Button01=1, 62:101:${getHex('select', '0D')}:00, 0.000, 0, 0`,
    `Button02=1, 66:${getHex('back', '1B')}:08:00, 0.000, 0, 0`,
    `Button03=1, 64:00:00:00, 0.000, 0, 0`,
    `Button04=1, 00:00:00:00, 0.000, 0, 0`,
    `Button05=1, ${getHex('prevPage', '51')}:00:00:00, 0.000, 0, 0`,
    `Button06=1, ${getHex('nextPage', '45')}:00:00:00, 0.000, 0, 0`,
    `Button07=1, 09:00:00:00, 0.000, 0, 0`, // Tab
    `Button08=1, 10:00:00:00, 0.000, 0, 0`, // Shift
    'Button09=1, 11:00:00:00, 0.000, 0, 0', // Control
    'Button10=1, 12:00:00:00, 0.000, 0, 0', // Alt
    `Button11=1, ${getHex('openMain', '31')}:00:00:00, 0.000, 0, 0`, // 1
    `Button12=1, ${getHex('openSocial', '34')}:00:00:00, 0.000, 0, 0`, // 4
    `Button13=1, A2:${getHex('overlay', '58')}:00:00, 0.000, 0, 0`, // Control+X
    '',
    '[Joystick 2]',
    'DefaultDisplayName=',
    'DefaultTemplateId=',
    ''
  ].join('\r\n')
}

// Fixed a typo in formatJ2KAction call above (formatJ2J -> formatJ2K)
export function formatJ2JAction(s: string) { return formatJ2KAction(s); }

/**
 * Saves the generated JoyToKey config to the user data directory
 */
export function saveJoyToKeyProfile(profileName: string = 'LaLa-HUB'): void {
  try {
    if (!fs.existsSync(JOYTOKEY_DIR)) {
      fs.mkdirSync(JOYTOKEY_DIR, { recursive: true })
    }
    
    const content = generateJoyToKeyConfig()
    const filePath = path.join(JOYTOKEY_DIR, `${profileName}.cfg`)
    
    // JoyToKey REQUIERE el BOM (Byte Order Mark) para UTF-16LE para no dar el archivo como corrupto
    const bom = Buffer.from([0xFF, 0xFE])
    const contentBuffer = Buffer.from(content, 'utf16le')
    const finalBuffer = Buffer.concat([bom, contentBuffer])
    
    fs.writeFileSync(filePath, finalBuffer)
    debugLog(`[JoyToKey] Perfil guardado (UTF-16LE con BOM): ${filePath}`)

    // Intentar copiar a Documentos/JoyToKey para que JoyToKey lo detecte nativamente
    const documentsPath = path.join(app.getPath('documents'), 'JoyToKey')
    try {
      if (!fs.existsSync(documentsPath)) {
        fs.mkdirSync(documentsPath, { recursive: true })
      }
      const destPath = path.join(documentsPath, `${profileName}.cfg`)
      fs.copyFileSync(filePath, destPath)
      debugLog(`[JoyToKey] Copiado a carpeta de perfiles: ${destPath}`)
    } catch (e) {
      debugError(`[JoyToKey] No se pudo copiar a Documentos: ${e}`)
    }
  } catch (error) {
    debugError(`[JoyToKey] Error al guardar el perfil: ${error}`)
  }
}

/**
 * Commands JoyToKey to load the specified profile.
 * Requires the path to JoyToKey.exe.
 */
export function loadJoyToKeyProfile(exePath: string, profileName: string = 'LaLa-HUB'): void {
  if (!exePath) {
    debugError('[JoyToKey] No se puede cargar el perfil: Ruta al ejecutable no definida.')
    return
  }

  // JoyToKey command line: JoyToKey.exe "ProfileName"
  // Usamos 'start /min' para que se abra minimizado y no robe el foco
  const command = `start /min "" "${exePath}" "${profileName}"`
  
  debugLog(`[JoyToKey] Intentando cargar perfil '${profileName}'...`)
  
  // Cerramos JoyToKey si ya está abierto para forzar el refresco de perfiles
  exec('taskkill /F /IM JoyToKey.exe', () => {
    // No importa si falla (si no estaba abierto), procedemos a abrirlo
    setTimeout(() => {
      exec(command, (error) => {
        if (error) {
          debugError(`[JoyToKey] Error al ejecutar: ${error.message}`)
          return
        }
        debugLog(`[JoyToKey] Ejecución exitosa.`)
      })
    }, 500) // Un pequeño delay para que Windows libere el proceso
  })
}
