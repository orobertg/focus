/* ============================================
   Focus Bubbles - Main Process (Electron)
   ============================================ */

const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

// Persistent storage with electron-store v8 (stable CommonJS support)
const Store = require('electron-store');
const store = new Store();

let mainWindow;
let toolbarWindow;
let settingsWindow;
let tray;
let clickThroughEnabled = false; // Start with click-through DISABLED for full interactivity

/* ============================================
   Window Creation
   ============================================ */

function createWindow() {
  console.log('[Electron] Creating main window...');
  
  // Load saved position or use defaults
  const savedPosition = store.get('windowPosition', { x: null, y: null });
  const windowOptions = {
    width: 280, // Just the timer
    height: 280,
    frame: false,
    transparent: false, // Solid window, no transparency
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false, // Show in taskbar for now (TODO: make configurable)
    backgroundColor: '#202020', // Match the bubble background
    roundedCorners: true, // Enable rounded corners on Windows
    icon: path.join(__dirname, 'assets', 'icons', 'icon-256.png'), // App icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    }
  };
  
  // Set position if saved
  if (savedPosition.x !== null && savedPosition.y !== null) {
    windowOptions.x = savedPosition.x;
    windowOptions.y = savedPosition.y;
    console.log('[Electron] Restoring window position:', savedPosition);
  }
  
  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile('index.html');

  // Open DevTools automatically (for development)
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // DON'T enable click-through by default - let user toggle with ALT+SHIFT+C
  // This allows the app to be fully interactive on startup
  console.log('[Electron] Click-through is DISABLED by default');
  console.log('[Electron] Press ALT+SHIFT+C to toggle click-through on/off');

  // Save window position when moved
  mainWindow.on('moved', () => {
    if (!mainWindow) return;
    const position = mainWindow.getPosition();
    store.set('windowPosition', { x: position[0], y: position[1] });
    console.log('[Electron] Saved window position:', position);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[Electron] Window created successfully');
  
  // Create toolbar window
  createToolbarWindow();
}

function createToolbarWindow() {
  console.log('[Electron] Creating toolbar window...');
  
  // Load saved toolbar position or calculate default (above main window)
  const savedToolbarPosition = store.get('toolbarPosition', { x: null, y: null });
  const toolbarOptions = {
    width: 160,
    height: 52,
    frame: false,
    transparent: false, // Solid window, no transparency
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true, // Don't show toolbar in taskbar
    backgroundColor: '#202020', // Match the toolbar background
    roundedCorners: true, // Enable rounded corners on Windows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false,
    }
  };
  
  // Set position if saved, otherwise position above main window
  if (savedToolbarPosition.x !== null && savedToolbarPosition.y !== null) {
    toolbarOptions.x = savedToolbarPosition.x;
    toolbarOptions.y = savedToolbarPosition.y;
  } else if (mainWindow) {
    const mainPos = mainWindow.getPosition();
    const mainSize = mainWindow.getSize();
    toolbarOptions.x = mainPos[0] + (mainSize[0] / 2) - 80; // Center above main
    toolbarOptions.y = mainPos[1] - 60; // 60px above main window
  }
  
  toolbarWindow = new BrowserWindow(toolbarOptions);
  toolbarWindow.loadFile('toolbar.html');
  
  // Save toolbar position when moved
  toolbarWindow.on('moved', () => {
    if (!toolbarWindow) return;
    const position = toolbarWindow.getPosition();
    store.set('toolbarPosition', { x: position[0], y: position[1] });
  });
  
  // Don't quit when toolbar is closed, just hide it
  toolbarWindow.on('close', (event) => {
    event.preventDefault();
    toolbarWindow.hide();
  });
  
  console.log('[Electron] Toolbar window created successfully');
}

function createSettingsWindow() {
  console.log('[Electron] Creating settings window...');
  
  // Don't create if already exists
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: '#282828',
    parent: mainWindow, // Modal behavior
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  
  settingsWindow.loadFile('settings.html');
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  
  console.log('[Electron] Settings window created');
}

/* ============================================
   Click-Through Management
   ============================================ */

function enableClickThrough() {
  if (!mainWindow) return;
  
  try {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    clickThroughEnabled = true;
    console.log('[Electron] ✅ Click-through ENABLED');
  } catch (error) {
    console.error('[Electron] ❌ Failed to enable click-through:', error);
  }
}

function disableClickThrough() {
  if (!mainWindow) return;
  
  try {
    mainWindow.setIgnoreMouseEvents(false);
    clickThroughEnabled = false;
    console.log('[Electron] ❌ Click-through DISABLED');
  } catch (error) {
    console.error('[Electron] Failed to disable click-through:', error);
  }
}

function toggleClickThrough() {
  if (clickThroughEnabled) {
    disableClickThrough();
  } else {
    enableClickThrough();
  }
}

/* ============================================
   System Tray
   ============================================ */

function createTray() {
  console.log('[Electron] Creating system tray...');
  
  // Use actual icon file
  const iconPath = path.join(__dirname, 'assets', 'icons', 'icon-32.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  try {
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Focus Bubbles', 
        type: 'normal',
        enabled: false 
      },
      { type: 'separator' },
      { 
        label: 'Show/Hide', 
        click: () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          }
        }
      },
      { 
        label: 'Toggle Click-Through', 
        click: toggleClickThrough
      },
      { type: 'separator' },
      { 
        label: 'Reset Position', 
        click: () => {
          if (mainWindow) {
            mainWindow.center();
            const position = mainWindow.getPosition();
            store.set('windowPosition', { x: position[0], y: position[1] });
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Focus Bubbles - Pomodoro Timer');
    tray.setContextMenu(contextMenu);
    
    // Double-click to show/hide
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    });
    
    console.log('[Electron] System tray created successfully');
  } catch (error) {
    console.error('[Electron] Failed to create system tray:', error);
  }
}

/* ============================================
   IPC Communication (Toolbar <-> Main Window)
   ============================================ */

// Handle toolbar button actions
ipcMain.on('toolbar-action', (event, action) => {
  console.log('[IPC] Toolbar action received:', action);
  
  if (!mainWindow || !mainWindow.webContents) return;
  
  // Forward action to main window
  mainWindow.webContents.send('toolbar-command', action);
});

// Listen for state updates from main window to forward to toolbar
ipcMain.on('state-update', (event, state) => {
  if (!toolbarWindow || !toolbarWindow.webContents) return;
  toolbarWindow.webContents.send('timer-state-update', state);
});

// Settings IPC handlers
ipcMain.on('settings-open', () => {
  createSettingsWindow();
});

ipcMain.on('settings-get', (event) => {
  const settings = store.get('settings', {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4,
    soundEnabled: true,
  });
  event.reply('settings-data', settings);
});

ipcMain.on('settings-save', (event, settings) => {
  console.log('[IPC] Saving settings:', settings);
  store.set('settings', settings);
  
  // Notify main window to apply settings
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('settings-updated', settings);
  }
});

/* ============================================
   Global Shortcuts
   ============================================ */

function registerGlobalShortcuts() {
  console.log('[Electron] Registering global shortcuts...');
  
  try {
    // ALT+SHIFT+P: Toggle window visibility
    globalShortcut.register('Alt+Shift+P', () => {
      console.log('[Shortcut] ALT+SHIFT+P pressed - Toggle visibility');
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    
    // ALT+SHIFT+C: Toggle click-through
    globalShortcut.register('Alt+Shift+C', () => {
      console.log('[Shortcut] ALT+SHIFT+C pressed - Toggle click-through');
      toggleClickThrough();
    });
    
    // ALT+SHIFT+S: Screenshot/Notes (TODO: Implement)
    globalShortcut.register('Alt+Shift+S', () => {
      console.log('[Shortcut] ALT+SHIFT+S pressed - Screenshot (TODO)');
      // TODO: Implement screenshot functionality
    });
    
    // ALT+SHIFT+N: Open notes (TODO: Implement)
    globalShortcut.register('Alt+Shift+N', () => {
      console.log('[Shortcut] ALT+SHIFT+N pressed - Open notes (TODO)');
      // TODO: Implement notes panel
    });
    
    console.log('[Electron] Global shortcuts registered successfully:');
    console.log('[Electron]   ALT+SHIFT+P: Toggle window visibility');
    console.log('[Electron]   ALT+SHIFT+C: Toggle click-through');
    console.log('[Electron]   ALT+SHIFT+S: Screenshot (TODO)');
    console.log('[Electron]   ALT+SHIFT+N: Open notes (TODO)');
  } catch (error) {
    console.error('[Electron] Failed to register global shortcuts:', error);
  }
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
  console.log('[Electron] All global shortcuts unregistered');
}

/* ============================================
   App Lifecycle
   ============================================ */

app.whenReady().then(() => {
  console.log('[Electron] App ready!');
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
  console.log('[Electron] All windows closed, app still running in tray');
});

app.on('will-quit', () => {
  console.log('[Electron] App quitting...');
  unregisterGlobalShortcuts();
});

// Handle app quit from tray
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
});

console.log('[Electron] Main process started');
