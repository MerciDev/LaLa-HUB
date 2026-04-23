import { BrowserWindow, screen } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';
import { getCurrentSessionData, formatPlaytime } from '../../utils/playtime';
import { isLoadingVisible } from '../loading/loading';

let overlayInstance: BrowserWindow | null = null;
let mainApp: BrowserWindow | null = null;

export function createOverlay(parent: BrowserWindow) {
    mainApp = parent;
    const { width, height } = screen.getPrimaryDisplay().bounds;

    overlayInstance = new BrowserWindow({
        width,
        height,
        x: 0,
        y: 0,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        focusable: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        transparent: true,
        hasShadow: false,
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

    overlayInstance.webContents.on('did-finish-load', () => {
        if (process.env.OVERLAY === 'true') {
            overlayInstance?.showInactive();
        }
    });

    return overlayInstance;
}

export function toggleOverlay() {
    if (!overlayInstance) {
        console.error('Overlay instance is null');
        return;
    }

    if (overlayInstance.isVisible()) {
        // Animate out, then hide
        overlayInstance.webContents.send('dispatch-action', { type: 'OVERLAY_CLOSING' });
        setTimeout(() => {
            if (overlayInstance?.isVisible()) {
                overlayInstance.hide();
                
                // If no game is running, restore focus to the Hub so navigation works
                if (!getCurrentSessionData()) {
                    mainApp?.show();
                    mainApp?.focus();
                }
            }
        }, 400);
    } else {
        if (isLoadingVisible()) return;

        // Ensure bounds cover full primary screen (game may be fullscreen)
        const { bounds } = screen.getPrimaryDisplay();
        overlayInstance.setBounds(bounds);

        // Highest alwaysOnTop level — sits above fullscreen games
        overlayInstance.setAlwaysOnTop(true, 'screen-saver', 1);
        overlayInstance.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

        const activeSession = getCurrentSessionData();
        let gameData: any = null;
        if (activeSession) {
            const { slot, session } = activeSession;
            const currentElapsedMinutes = Math.round((Date.now() - session.startTime) / 1000 / 60);
            const totalMinutes = (slot.game?.playtimeMinutes || 0) + currentElapsedMinutes;
            gameData = {
                id: slot.id,
                label: slot.label,
                platform: slot.game?.platform || null,
                console: slot.game?.platform?.name || 'PC',
                playtimeStr: formatPlaytime(totalMinutes),
                sessionStartTime: session.startTime,
                imageUrl: slot.squareImage || slot.thumbImage || null
            };
        }

        overlayInstance.webContents.send('dispatch-action', { 
            type: 'OVERLAY_SHOWN', 
            payload: { gameData } 
        });
        overlayInstance.show();
        overlayInstance.focus();
    }
}