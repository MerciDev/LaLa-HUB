export const keymaps = {
    overlay: 'Control+X',
    loading: 'Control+L',
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
