import { checkFileExists, readJson, saveJson } from "../utils/storage";
import { InterfaceSettings } from "../../shared/types";

export const interfaceSettings: InterfaceSettings = {
    showGameBackground: true,
}

export function loadInterfaceSettings(): void {
    if (!checkFileExists('config', 'interface')) {
        saveJson('config', 'interface', interfaceSettings);
        return
    }
    
    const settingsData = readJson<InterfaceSettings>('config', 'interface');
    if (settingsData) {
        Object.assign(interfaceSettings, settingsData);
    }
}

export function saveInterfaceSettings(settings: InterfaceSettings): void {
    Object.assign(interfaceSettings, settings);
    saveJson('config', 'interface', interfaceSettings);
}
