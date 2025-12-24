import { BrowserWindow } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

let overlayInstance: BrowserWindow | null = null;
let mainApp: BrowserWindow | null = null;

export function createOverlay(parent: BrowserWindow) {
    mainApp = parent;
    overlayInstance = new BrowserWindow({
        width: parent.getBounds().width,
        height: parent.getBounds().height,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'),
        }
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        overlayInstance.loadURL(
            `${process.env['ELECTRON_RENDERER_URL']}/src/windows/overlay/overlay.html`
        );
    } else {
        overlayInstance.loadFile(
            join(__dirname, '../../renderer/src/windows/overlay/overlay.html')
        );
    }

    overlayInstance.webContents.on('did-finish-load', async () => {
        try {
            const screenshot = await parent.webContents.capturePage();
            const dataUrl = screenshot.toDataURL();

            overlayInstance?.webContents.send('background-image', dataUrl);

            if (process.env.OVERLAY === 'true') {
                overlayInstance?.showInactive();
            }
        } catch (error) {
            console.error('Error capturando screenshot:', error);
            if (process.env.OVERLAY === 'true') {
                overlayInstance?.showInactive();
            }
        }
    });

    return overlayInstance;
}

export function toggleOverlay() {
    if (overlayInstance) {
        if (overlayInstance.isVisible()) {
            overlayInstance.hide();
        } else {
            if (mainApp) {
                const bounds = mainApp.getBounds();
                overlayInstance.setBounds(bounds);
            }
            overlayInstance.show();
        }
    }
}