import { checkFileExists, readJson, saveJson } from "../utils/storage";

export const keymaps = {

    // Keyboard
    overlay: 'Control+X',
    loading: 'Control+L',
    contextMenu: 'Shift',
    right: 'ArrowRight',
    left: 'ArrowLeft',
    up: 'ArrowUp',
    down: 'ArrowDown',
    select: 'Enter',
    back: 'Escape',

    // Gamepad
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
    }
    saveJson('config', 'keymaps', keymaps);
    const keymapsData = readJson('config', 'keymaps');
    if (keymapsData) {
        Object.assign(keymaps, keymapsData);
    }
}