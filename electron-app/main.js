/* ============================================
   Focus Bubbles - Main Process (Electron)
   ============================================ */

const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');

// Persistent storage with electron-store v8 (stable CommonJS support)
const Store = require('electron-store');
const store = new Store();

/* ============================================
   Single Instance Lock
   ============================================ */

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Exiting...');
  
  // Show warning dialog before quitting
  dialog.showErrorBox(
    'Focus App Already Running',
    'Focus app is already running.\n\nPlease check your system tray or taskbar.'
  );
  
  app.quit();
} else {
  // Handle second-instance attempt - focus the existing window
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[Electron] Second instance detected. Focusing existing window...');
    
    // Focus the main window if it exists
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
      
      // Also ensure always-on-top if enabled
      if (currentSettings && currentSettings.alwaysOnTop) {
        ensureAlwaysOnTop();
      }
    }
  });
}

let mainWindow;
let toolbarWindow;
let settingsWindow;
let tray;
let clickThroughEnabled = false; // Start with click-through DISABLED for full interactivity
let currentSettings = null; // Store current settings including alwaysOnTop
let isDocked = false; // Track if window is docked
let dockedEdge = null; // Track which edge: 'top', 'bottom', 'left', 'right'
let isCollapsed = false; // Track if window is collapsed when docked

/* ============================================
   Window Creation
   ============================================ */

function createWindow() {
  console.log('[Electron] Creating main window...');
  
  // Load saved position or use defaults
  const savedPosition = store.get('windowPosition', { x: null, y: null });
  // Load settings to check alwaysOnTop preference
  const settings = store.get('settings', {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4,
    soundEnabled: true,
    alwaysOnTop: false, // Default to OFF
  });
  currentSettings = settings;
  
  const windowOptions = {
    width: 280,
    height: 340, // Increased to fit settings panel without scrollbar
    frame: false,
    transparent: false, // Solid window, no transparency
    alwaysOnTop: settings.alwaysOnTop === true, // Respect user setting
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

  // Re-assert always-on-top only when necessary (avoid flickering)
  mainWindow.on('blur', () => {
    // When losing focus, schedule a re-assertion
    ensureAlwaysOnTop();
  });

  mainWindow.on('show', () => {
    ensureAlwaysOnTop();
  });

  // Save window position when moved and re-assert always-on-top
  mainWindow.on('moved', () => {
    if (!mainWindow) return;
    
    // Check if window should snap to edge
    checkAndSnapToEdge();
    
    const position = mainWindow.getPosition();
    store.set('windowPosition', { x: position[0], y: position[1] });
    console.log('[Electron] Saved window position:', position);
    ensureAlwaysOnTop(); // Re-assert after drag completes
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
    width: 320,
    height: 52,
    frame: false,
    transparent: false, // Solid window, no transparency
    alwaysOnTop: currentSettings?.alwaysOnTop === true, // Respect user setting
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
    toolbarOptions.x = mainPos[0] + (mainSize[0] / 2) - 160; // Center above main (half of 320px width)
    toolbarOptions.y = mainPos[1] - 60; // 60px above main window
  }
  
  toolbarWindow = new BrowserWindow(toolbarOptions);
  toolbarWindow.loadFile('toolbar.html');
  
  // Re-assert always-on-top only when necessary (avoid flickering)
  toolbarWindow.on('blur', () => {
    // When losing focus, schedule a re-assertion
    ensureAlwaysOnTop();
  });

  toolbarWindow.on('show', () => {
    ensureAlwaysOnTop();
  });
  
  // Save toolbar position when moved and re-assert always-on-top
  toolbarWindow.on('moved', () => {
    if (!toolbarWindow) return;
    const position = toolbarWindow.getPosition();
    store.set('toolbarPosition', { x: position[0], y: position[1] });
    ensureAlwaysOnTop(); // Re-assert after drag completes
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
    height: 550, // Increased for new window behavior section
    frame: false,
    transparent: false,
    alwaysOnTop: true, // Settings always on top when open
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
  
  // Re-assert always-on-top only when necessary (avoid flickering)
  settingsWindow.on('show', () => {
    ensureAlwaysOnTop();
  });
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  
  console.log('[Electron] Settings window created');
}

/* ============================================
   Click-Through Management
   ============================================ */

let ensureAlwaysOnTopTimeout = null;

function ensureAlwaysOnTop() {
  // Only enforce if the setting is enabled
  if (!currentSettings || currentSettings.alwaysOnTop !== true) {
    return;
  }
  
  // Debounce to prevent flickering from rapid calls
  if (ensureAlwaysOnTopTimeout) {
    clearTimeout(ensureAlwaysOnTopTimeout);
  }
  
  ensureAlwaysOnTopTimeout = setTimeout(() => {
    // Ensure all windows stay on top - only if visible and setting enabled
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }
    if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
      toolbarWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }
    if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
      settingsWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }
    ensureAlwaysOnTopTimeout = null;
  }, 200); // 200ms debounce - enough to prevent flicker but responsive
}

function applyAlwaysOnTopSetting(enabled) {
  console.log('[Electron] Applying always-on-top setting:', enabled);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(enabled === true, 'pop-up-menu');
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.setAlwaysOnTop(enabled === true, 'pop-up-menu');
  }
}

/* ============================================
   Docking System
   ============================================ */

let originalWindowSize = null; // Store size before collapse

function checkAndSnapToEdge() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const { screen } = require('electron');
  const snapThreshold = 30; // pixels from edge to trigger snap
  
  const windowBounds = mainWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: windowBounds.x, y: windowBounds.y });
  const workArea = display.workArea; // Excludes taskbar area
  
  let snapped = false;
  let newX = windowBounds.x;
  let newY = windowBounds.y;
  
  // Check proximity to each edge
  const distanceToTop = windowBounds.y - workArea.y;
  const distanceToLeft = windowBounds.x - workArea.x;
  const distanceToRight = (workArea.x + workArea.width) - (windowBounds.x + windowBounds.width);
  const distanceToBottom = (workArea.y + workArea.height) - (windowBounds.y + windowBounds.height);
  
  // Snap to top
  if (distanceToTop >= 0 && distanceToTop < snapThreshold) {
    newY = workArea.y;
    dockedEdge = 'top';
    isDocked = true;
    snapped = true;
    console.log('[Docking] Snapped to TOP');
  }
  // Snap to left
  else if (distanceToLeft >= 0 && distanceToLeft < snapThreshold) {
    newX = workArea.x;
    dockedEdge = 'left';
    isDocked = true;
    snapped = true;
    console.log('[Docking] Snapped to LEFT');
  }
  // Snap to right
  else if (distanceToRight >= 0 && distanceToRight < snapThreshold) {
    newX = workArea.x + workArea.width - windowBounds.width;
    dockedEdge = 'right';
    isDocked = true;
    snapped = true;
    console.log('[Docking] Snapped to RIGHT');
  }
  // Snap to bottom
  else if (distanceToBottom >= 0 && distanceToBottom < snapThreshold) {
    newY = workArea.y + workArea.height - windowBounds.height;
    dockedEdge = 'bottom';
    isDocked = true;
    snapped = true;
    console.log('[Docking] Snapped to BOTTOM');
  }
  // Not near any edge - undock
  else {
    if (isDocked) {
      console.log('[Docking] Undocked from', dockedEdge);
      isDocked = false;
      dockedEdge = null;
      if (isCollapsed) {
        expandWindow(); // Auto-expand when undocked
      }
    }
  }
  
  // Apply snap position
  if (snapped) {
    mainWindow.setBounds({ x: newX, y: newY, width: windowBounds.width, height: windowBounds.height });
  }
  
  return snapped;
}

function toggleCollapse() {
  if (!isDocked) {
    console.log('[Collapse] Cannot collapse - window not docked');
    return;
  }
  
  if (isCollapsed) {
    expandWindow();
  } else {
    collapseWindow();
  }
}

function collapseWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || !isDocked) return;
  
  console.log('[Collapse] Collapsing window...');
  
  const currentBounds = mainWindow.getBounds();
  originalWindowSize = { width: currentBounds.width, height: currentBounds.height };
  
  const handleSize = 32; // Size of the collapsed handle
  let newBounds = { ...currentBounds };
  
  // Collapse based on docked edge
  if (dockedEdge === 'top' || dockedEdge === 'bottom') {
    newBounds.height = handleSize;
  } else if (dockedEdge === 'left' || dockedEdge === 'right') {
    newBounds.width = handleSize;
  }
  
  mainWindow.setBounds(newBounds);
  isCollapsed = true;
  
  // Notify renderer to show collapsed UI
  if (mainWindow.webContents) {
    mainWindow.webContents.send('window-collapsed', { edge: dockedEdge });
  }
  
  console.log('[Collapse] Window collapsed to', dockedEdge, 'edge');
}

function expandWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  console.log('[Collapse] Expanding window...');
  
  if (!originalWindowSize) {
    originalWindowSize = { width: 280, height: 340 }; // Default size
  }
  
  const currentBounds = mainWindow.getBounds();
  let newBounds = { ...currentBounds };
  
  // Restore original size
  newBounds.width = originalWindowSize.width;
  newBounds.height = originalWindowSize.height;
  
  // Adjust position to keep it docked to the same edge
  if (dockedEdge === 'right') {
    newBounds.x = currentBounds.x - (originalWindowSize.width - currentBounds.width);
  } else if (dockedEdge === 'bottom') {
    newBounds.y = currentBounds.y - (originalWindowSize.height - currentBounds.height);
  }
  
  mainWindow.setBounds(newBounds);
  isCollapsed = false;
  
  // Notify renderer to show expanded UI
  if (mainWindow.webContents) {
    mainWindow.webContents.send('window-expanded');
  }
  
  console.log('[Collapse] Window expanded');
}

function enableClickThrough() {
  if (!mainWindow) return;
  
  try {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    clickThroughEnabled = true;
    ensureAlwaysOnTop(); // Re-assert always-on-top
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
    ensureAlwaysOnTop(); // Re-assert always-on-top
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
        label: 'Focus', 
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
              ensureAlwaysOnTop();
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
          console.log('[Tray] Quit clicked');
          // Destroy tray before quitting
          if (tray && !tray.isDestroyed()) {
            tray.destroy();
            tray = null;
          }
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Focus - Pomodoro Timer');
    tray.setContextMenu(contextMenu);
    
    // Double-click to show/hide
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          ensureAlwaysOnTop();
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

// Handle double-click for collapse/expand
ipcMain.on('window-double-click', () => {
  console.log('[IPC] Double-click received, isDocked:', isDocked, 'isCollapsed:', isCollapsed);
  
  if (isDocked) {
    toggleCollapse();
  }
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
    alwaysOnTop: false, // Default to OFF
  });
  currentSettings = settings;
  event.reply('settings-data', settings);
});

ipcMain.on('settings-save', (event, settings) => {
  console.log('[IPC] Saving settings:', settings);
  store.set('settings', settings);
  currentSettings = settings;
  
  // Apply always-on-top setting immediately
  applyAlwaysOnTopSetting(settings.alwaysOnTop);
  
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
          ensureAlwaysOnTop();
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
  
  // Destroy tray icon to remove it from system tray
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
    console.log('[Electron] Tray icon destroyed');
  }
});

// Handle app quit from tray
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
});

console.log('[Electron] Main process started');
