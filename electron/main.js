import { app, BrowserWindow, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;
let win = null;
let isQuitting = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "نظام المحاسبة المدرسي",
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    show: false // Wait to show until loaded
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    // In production, load the built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('ready-to-show', () => {
    const isHidden = process.argv.includes('--hidden');
    if (!isHidden) {
      win.show();
    }
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
      return false;
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'فتح التطبيق', click: () => win.show() },
    { type: 'separator' },
    { 
      label: 'إغلاق تماماً', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('نظام المحاسبة المدرسي - يعمل في الخلفية');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        if (win.isMinimized()) win.restore();
        win.focus();
      } else {
        win.show();
      }
    }
  });
}

app.whenReady().then(() => {
  // Setup auto-start at login
  app.setLoginItemSettings({
    openAtLogin: true,
    args: ['--hidden']
  });

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (win) {
      win.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Do not quit, stay in the background
  }
});
