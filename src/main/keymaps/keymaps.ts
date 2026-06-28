import { checkFileExists, readJson, saveJson } from "../utils/storage";

export const keymaps = {

    // Navegación (Stick 1 y POV mapeados a las mismas acciones)
    up: 'ArrowUp | W',
    down: 'ArrowDown | S',
    left: 'ArrowLeft | A',
    right: 'ArrowRight | D',

    // Botones de Acción
    select: 'Enter',
    back: 'Escape',
    overlay: 'Control+X',
    contextMenu: 'Shift',
    openMain: 'Home | 1',
    openSocial: 'Insert | 4',
    
    // Auxiliares
    nextPage: 'E',
    prevPage: 'Q',

    // JoyToKey Config
    joyToKeyPath: 'C:\\Program Files (x86)\\JoyToKey\\JoyToKey.exe',
    useJoyToKey: false,

    // Gamepad Labels (Para referencia visual en la UI)
    gamepadA: 'A',
    gamepadB: 'B',
    gamepadX: 'X',
    gamepadY: 'Y',
    gamepadLB: 'LB',
    gamepadRB: 'RB',
    gamepadLT: 'LT',
    gamepadRT: 'RT',
    gamepadSelect: 'Select',
    gamepadStart: 'Start',
    gamepadLeftStick: 'Left Stick',
    gamepadRightStick: 'Right Stick',
    gamepadUp: 'Up',
    gamepadDown: 'Down',
    gamepadLeft: 'Left',
    gamepadRight: 'Right',
    gamepadOverlayCombo: 'RS+Select',
}

export function createDebouncedToggle(toggleFn: () => void, cooldownMs = 300) {
    let isCooldown = false;
    return () => {
        if (isCooldown) return;
        isCooldown = true;
        toggleFn();
        setTimeout(() => {
            isCooldown = false;
        }, cooldownMs);
    };
}

export function loadKeymaps(): void {
    if (!checkFileExists('config', 'keymaps')) {
        saveJson('config', 'keymaps', keymaps);
        return
    }
    
    const keymapsData = readJson<any>('config', 'keymaps');
    if (keymapsData) {
        const existingKeys = Object.keys(keymapsData)
        const defaultKeys = Object.keys(keymaps)
        const hasNewKeys = defaultKeys.some(k => !existingKeys.includes(k))
        const needsMigration = keymapsData.gamepadOverlayCombo === 'L3R3'

        Object.assign(keymaps, keymapsData);

        if (needsMigration) {
            keymaps.gamepadOverlayCombo = 'RS+Select'
        }

        if (hasNewKeys || needsMigration) {
            saveJson('config', 'keymaps', keymaps);
        }
    }
}