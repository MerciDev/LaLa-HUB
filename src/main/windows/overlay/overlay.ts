import { BrowserWindow } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';

let overlayInstance: BrowserWindow | null = null;

export function createOverlay(parent: BrowserWindow) {
    overlayInstance = new BrowserWindow({
        width: parent.getBounds().width,
        height: parent.getBounds().height,
        show: false, // No mostrar inmediatamente
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        parent: parent,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'), // Habilitar IPC
        }
    });

    // En desarrollo, carga desde el servidor de Vite
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        overlayInstance.loadURL(
            `${process.env['ELECTRON_RENDERER_URL']}/src/windows/overlay/overlay.html`
        );
    } else {
        // En producción, carga el archivo HTML compilado
        overlayInstance.loadFile(
            join(__dirname, '../../renderer/src/windows/overlay/overlay.html')
        );
    }

    // Cuando el overlay esté cargado, capturar y enviar el screenshot de la ventana principal
    overlayInstance.webContents.on('did-finish-load', async () => {
        try {
            // Capturar la ventana principal
            const screenshot = await parent.webContents.capturePage();
            const dataUrl = screenshot.toDataURL();
            
            // Enviar la imagen al overlay para usarla como fondo
            overlayInstance?.webContents.send('background-image', dataUrl);
            
            // Mostrar el overlay después de tener el fondo
            if (process.env.OVERLAY === 'true') {
                overlayInstance?.show();
            }
        } catch (error) {
            console.error('Error capturando screenshot:', error);
            // Mostrar de todas formas aunque falle la captura
            if (process.env.OVERLAY === 'true') {
                overlayInstance?.show();
            }
        }
    });

    return overlayInstance;
}
