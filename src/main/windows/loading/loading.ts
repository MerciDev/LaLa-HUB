import { BrowserWindow, screen, ipcMain } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

let loadingInstance: BrowserWindow | null = null;

/** Called once from createLoading — registers the dismiss IPC handler. */
function registerIPC(): void {
    // Allow the loading renderer to dismiss itself (e.g. user presses Escape)
    ipcMain.on('loading-dismiss', () => {
        hideLoading()
    })
}
let ipcRegistered = false

export function createLoading(parent: BrowserWindow) {
    loadingInstance = new BrowserWindow({
        width: parent.getBounds().width,
        height: parent.getBounds().height,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        // On macOS, skipTaskbar avoids the loading window appearing in the Dock
        skipTaskbar: true,
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

    // Register IPC once
    if (!ipcRegistered) {
        registerIPC()
        ipcRegistered = true
    }

    return loadingInstance;
}

/**
 * Shows the loading screen covering the entire primary display.
 * Uses setBounds instead of setFullScreen to avoid macOS's animated
 * fullscreen transition, which temporarily breaks alwaysOnTop.
 */
export function showLoading(item?: any): void {
    if (!loadingInstance) return;
    if (loadingInstance.isVisible()) return; // already shown

    if (item) {
        loadingInstance.webContents.send('set-loading-data', item);
    }

    // Cover the full primary display without entering macOS fullscreen mode
    const { bounds } = screen.getPrimaryDisplay();
    loadingInstance.setBounds(bounds);
    loadingInstance.setAlwaysOnTop(true, 'screen-saver', 2);
    loadingInstance.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    loadingInstance.show();
    loadingInstance.focus();
}

/**
 * Hides the loading screen.
 */
export function hideLoading(): void {
    if (!loadingInstance) return;
    if (!loadingInstance.isVisible()) return; // already hidden
    loadingInstance.hide();
}

export function isLoadingVisible(): boolean {
    return !!loadingInstance && loadingInstance.isVisible();
}

/**
 * Legacy toggle kept for compatibility with the keyboard shortcut binding.
 * Prefer showLoading / hideLoading for explicit control.
 */
export function toggleLoading(item?: any): void {
    if (!loadingInstance) return;
    if (loadingInstance.isVisible()) {
        hideLoading();
    } else {
        showLoading(item);
    }
}