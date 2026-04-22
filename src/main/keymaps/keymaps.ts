import { checkFileExists, readJson, saveJson } from "../utils/storage";

export const keymaps = {

    // Keyboard
    overlay: 'Control+X',
    contextMenu: 'Shift',
    openMain: 'Home',
    openSocial: 'Insert',
    right: 'ArrowRight',
    left: 'ArrowLeft',
    up: 'ArrowUp',
    down: 'ArrowDown',
    select: 'Enter',
    back: 'Escape',
    nextPage: 'E',
    prevPage: 'Q',

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
        // First run: persist the defaults so the user can edit the file
        saveJson('config', 'keymaps', keymaps);
    }
    // Load saved keymaps (may include user customisations) and merge into defaults
    const keymapsData = readJson('config', 'keymaps');
    if (keymapsData) {
        Object.assign(keymaps, keymapsData);
    }
}