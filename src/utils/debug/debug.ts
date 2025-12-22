export function debugLog(message: string) {
    if (process.env.DEBUG_MODE === 'true') {
        console.log(message);
    }
}

export function debugError(message: string) {
    if (process.env.DEBUG_MODE === 'true') {
        console.error(message);
    }
}