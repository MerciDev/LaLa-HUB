import { BrowserWindow } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

let loadingInstance: BrowserWindow | null = null;
let parentWindow: BrowserWindow | null = null;

export function createLoading(parent: BrowserWindow) {
    parentWindow = parent;
    loadingInstance = new BrowserWindow({
        width: parent.getBounds().width,
        height: parent.getBounds().height,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        parent: parent,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'),
        }
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        loadingInstance.loadURL(
            `${process.env['ELECTRON_RENDERER_URL']}/src/windows/loading/loading.html`
        );
    } else {
        loadingInstance.loadFile(
            join(__dirname, '../../renderer/src/windows/loading/loading.html')
        );
    }

    loadingInstance.webContents.on('did-finish-load', async () => {
        try {
            const screenshot = await parent.webContents.capturePage();
            const dataUrl = screenshot.toDataURL();

            loadingInstance?.webContents.send('background-image', dataUrl);

            if (process.env.LOADING === 'true') {
                loadingInstance?.show();
            }
        } catch (error) {
            console.error('Error capturando screenshot:', error);
            if (process.env.LOADING === 'true') {
                loadingInstance?.show();
            }
        }
    });

    return loadingInstance;
}

export function toggleLoading() {
    if (loadingInstance) {
        if (loadingInstance.isVisible()) {
            loadingInstance.hide();
        } else {
            if (parentWindow) {
                const bounds = parentWindow.getBounds();
                loadingInstance.setBounds(bounds);
            }
            loadingInstance.show();
        }
    }
}