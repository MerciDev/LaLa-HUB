import { BrowserWindow } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

let loadingInstance: BrowserWindow | null = null;

export function createLoading(parent: BrowserWindow) {
    loadingInstance = new BrowserWindow({
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
                loadingInstance?.showInactive();
            }
        } catch (error) {
            console.error('Error capturando screenshot:', error);
            if (process.env.LOADING === 'true') {
                loadingInstance?.showInactive();
            }
        }
    });

    return loadingInstance;
}

export function toggleLoading(item?: any) {
    if (loadingInstance) {
        if (loadingInstance.isVisible()) {
            loadingInstance.hide();
        } else {
            if (item) {
                loadingInstance.webContents.send('set-loading-data', item);
            }
            loadingInstance.setAlwaysOnTop(true, 'screen-saver', 2);
            loadingInstance.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            loadingInstance.setFullScreen(true);
            loadingInstance.show();
            loadingInstance.focus();
        }
    }
}