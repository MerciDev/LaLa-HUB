import { app, BrowserWindow, screen } from 'electron'
import { debugLog, debugError } from '../utils/debug/debug';
import { createOverlay } from './windows/overlay/overlay';

let appWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  appWindow = new BrowserWindow({
    width: process.env.WINDOWED_BORDERLESS ? width : 800,
    height: process.env.WINDOWED_BORDERLESS ? height : 600,
    frame: process.env.WINDOWED_BORDERLESS !== 'true',
    resizable: process.env.WINDOWED_BORDERLESS !== 'true',
    autoHideMenuBar: true,
  })

  debugLog('Main Window created.');

  appWindow.loadURL('https://example.com');
  overlayWindow = createOverlay(appWindow);
}

async function main(): Promise<void> {
  process.env.DEBUG_MODE = 'true';
  process.env.WINDOWED_BORDERLESS = 'true';
  process.env.OVERLAY = 'true';
  await app.whenReady();
  createWindow();
}
main().catch((error) => {
  debugError(error);
});