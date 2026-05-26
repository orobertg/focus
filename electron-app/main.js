/* ============================================
   Focus Bubbles - Main Process (Electron)
   ============================================ */

const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');

// Persistent storage with electron-store v8 (stable CommonJS support)
const Store = require('electron-store');
const store = new Store();

// SQLite session history / stats
const sessionsDb = require('./db.js');

/* ============================================
   Single Instance Lock
   ============================================ */

// Set a consistent app ID across all versions (dev, portable, installed)
// This ensures only ONE instance can run regardless of how it's launched
app.setAppUserModelId('com.focus.timer');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Exiting...');
  console.log('[Electron] App ID: com.focus.timer');
  console.log('[Electron] This process will now exit.');
  
  // Show warning dialog before quitting
  dialog.showErrorBox(
    'Focus App Already Running',
    'Focus app is already running.\n\nOnly one instance of Focus can run at a time.\n\nPlease check your system tray or taskbar.'
  );
  
  // Force immediate exit
  process.exit(0);
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

  // Open DevTools automatically (for development only)
  // Set NODE_ENV=development or pass --dev flag to enable
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    console.log('[Electron] DevTools opened (development mode)');
  }

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
  console.log('[Electron] Creating options window...');
  
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
  
  console.log('[Electron] Options window created');
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
  
  // Icon path handling for dev vs production
  // In production: icons are in extraResources (resources/icons/)
  // In development: icons are in assets/icons/
  let iconPath;
  if (app.isPackaged) {
    // Production: icons copied to resources/icons/ via extraResources
    iconPath = path.join(process.resourcesPath, 'icons', 'icon-32.png');
  } else {
    // Development: icons are in assets/icons/ relative to main.js
    iconPath = path.join(__dirname, 'assets', 'icons', 'icon-32.png');
  }
  
  console.log('[Electron] Tray icon path:', iconPath);
  console.log('[Electron] App is packaged:', app.isPackaged);
  console.log('[Electron] __dirname:', __dirname);
  console.log('[Electron] process.resourcesPath:', process.resourcesPath);
  
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  if (trayIcon.isEmpty()) {
    console.error('[Electron] Failed to load tray icon from:', iconPath);
    console.error('[Electron] Icon file exists?', require('fs').existsSync(iconPath));
    
    // Try alternative path as fallback
    const altIconPath = path.join(__dirname, 'assets', 'icons', 'icon-32.png');
    console.log('[Electron] Trying alternative path:', altIconPath);
    console.log('[Electron] Alternative path exists?', require('fs').existsSync(altIconPath));
    
    const altTrayIcon = nativeImage.createFromPath(altIconPath);
    
    if (altTrayIcon.isEmpty()) {
      console.error('[Electron] ❌ All icon paths failed. Tray will not be created.');
      console.error('[Electron] This means the app cannot be quit cleanly from the tray.');
      return;
    } else {
      console.log('[Electron] ✅ Alternative path worked!');
      createTrayWithIcon(altTrayIcon);
      return;
    }
  }
  
  console.log('[Electron] ✅ Tray icon loaded successfully from primary path');
  createTrayWithIcon(trayIcon);
}

function createTrayWithIcon(trayIcon) {
  try {
    tray = new Tray(trayIcon);
    
    if (!tray || tray.isDestroyed()) {
      console.error('[Electron] Tray creation failed - tray object invalid');
      tray = null;
      return;
    }
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Focus App', 
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
        label: 'Quit Focus App', 
        click: () => {
          console.log('[Tray] Quit clicked by user');
          quitApp();
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
    
    // Monitor tray for destruction
    tray.on('click', () => {
      console.log('[Tray] Tray icon clicked (tray is responsive)');
    });
    
    console.log('[Electron] ✅ System tray created successfully - app will persist in tray');
  } catch (error) {
    console.error('[Electron] ❌ Failed to create system tray:', error);
    tray = null;
    // App will quit if windows close without a tray
  }
}

/* ============================================
   Clean Quit Function
   ============================================ */

function quitApp() {
  console.log('[App] Clean quit initiated...');
  
  // 1. Unregister all global shortcuts
  console.log('[App] Unregistering global shortcuts...');
  globalShortcut.unregisterAll();
  
  // 2. Destroy tray icon
  if (tray && !tray.isDestroyed()) {
    console.log('[App] Destroying tray icon...');
    tray.destroy();
    tray = null;
  }
  
  // 3. Close all windows gracefully
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[App] Closing main window...');
    mainWindow.removeAllListeners('close');
    mainWindow.destroy();
    mainWindow = null;
  }
  
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    console.log('[App] Closing toolbar window...');
    toolbarWindow.destroy();
    toolbarWindow = null;
  }
  
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    console.log('[App] Closing settings window...');
    settingsWindow.destroy();
    settingsWindow = null;
  }
  
  // 4. Quit the application
  console.log('[App] Quitting application...');
  app.quit();
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
   Sessions IPC (session history + stats)
   ============================================ */

ipcMain.handle('session-start', (event, payload) => {
  try {
    sessionsDb.startSession(payload);
    return { ok: true };
  } catch (err) {
    console.error('[DB] session-start failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('session-complete', (event, payload) => {
  try {
    const changes = sessionsDb.completeSession(payload);
    return { ok: true, changes };
  } catch (err) {
    console.error('[DB] session-complete failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('session-abandon', (event, payload) => {
  try {
    const changes = sessionsDb.abandonSession(payload);
    return { ok: true, changes };
  } catch (err) {
    console.error('[DB] session-abandon failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('session-find-active', () => {
  try {
    return { ok: true, session: sessionsDb.findActiveSession() };
  } catch (err) {
    console.error('[DB] session-find-active failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('session-delete', (event, sessionUuid) => {
  try {
    const changes = sessionsDb.deleteSession(sessionUuid);
    return { ok: true, changes };
  } catch (err) {
    console.error('[DB] session-delete failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('stats-get', () => {
  try {
    return { ok: true, stats: sessionsDb.getStats() };
  } catch (err) {
    console.error('[DB] stats-get failed:', err);
    return { ok: false, error: err.message };
  }
});

/* ============================================
   Notes IPC (notes + note tasks)
   ============================================ */

ipcMain.handle('notes-list', () => {
  try {
    return { ok: true, notes: sessionsDb.listNotes() };
  } catch (err) {
    console.error('[DB] notes-list failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('note-create', (event, payload) => {
  try {
    const note = sessionsDb.createNote(payload);
    return { ok: true, note };
  } catch (err) {
    console.error('[DB] note-create failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('task-create', (event, payload) => {
  try {
    const task = sessionsDb.createTask(payload);
    return { ok: true, task };
  } catch (err) {
    console.error('[DB] task-create failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('task-toggle', (event, payload) => {
  try {
    const result = sessionsDb.toggleTask(payload);
    return { ok: true, ...result };
  } catch (err) {
    console.error('[DB] task-toggle failed:', err);
    return { ok: false, error: err.message };
  }
});

/* ============================================
   Session Recovery Dialog
   ============================================ */

async function maybePromptSessionRecovery() {
  let active = null;
  try {
    active = sessionsDb.findActiveSession();
  } catch (err) {
    console.error('[Recovery] failed to check for active session:', err);
    return;
  }
  if (!active) return;

  const elapsedMin = Math.round(((Date.now() - active.started_at) / 60000));
  const phaseLabel = (active.phase === 'work' || active.phase === 'Work') ? 'focus' : 'break';

  const choice = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Keep as completed', 'Discard'],
    defaultId: 0,
    cancelId: 1,
    title: 'Unfinished session detected',
    message: `Focus exited mid-${phaseLabel} session.`,
    detail: `Started ~${elapsedMin} minute(s) ago. Keep it as completed for stats, or discard?`,
  });

  const endedAt = Date.now();
  const actualMs = Math.min(endedAt - active.started_at, active.planned_ms);
  if (choice.response === 0) {
    sessionsDb.completeSession({
      sessionUuid: active.session_uuid,
      endedAt,
      actualMs,
    });
    console.log('[Recovery] kept unfinished session as completed:', active.session_uuid);
  } else {
    sessionsDb.deleteSession(active.session_uuid);
    console.log('[Recovery] discarded unfinished session:', active.session_uuid);
  }
}

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
    
    // ALT+SHIFT+N: Open notes panel
    globalShortcut.register('Alt+Shift+N', () => {
      console.log('[Shortcut] ALT+SHIFT+N pressed - Open notes');
      if (mainWindow && mainWindow.webContents) {
        mainWindow.show();
        mainWindow.focus();
        ensureAlwaysOnTop();
        mainWindow.webContents.send('toolbar-command', 'notes');
      }
    });
    
    // ALT+SHIFT+O: Open options/settings
    globalShortcut.register('Alt+Shift+O', () => {
      console.log('[Shortcut] ALT+SHIFT+O pressed - Open options');
      if (mainWindow && mainWindow.webContents) {
        mainWindow.show();
        mainWindow.focus();
        ensureAlwaysOnTop();
        // Send command to renderer to open settings
        mainWindow.webContents.send('toolbar-command', 'settings');
      }
    });
    
    console.log('[Electron] Global shortcuts registered successfully:');
    console.log('[Electron]   ALT+SHIFT+P: Toggle window visibility');
    console.log('[Electron]   ALT+SHIFT+C: Toggle click-through');
    console.log('[Electron]   ALT+SHIFT+O: Open options/settings');
    console.log('[Electron]   ALT+SHIFT+S: Screenshot (TODO)');
    console.log('[Electron]   ALT+SHIFT+N: Open notes');
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
  console.log('[Electron] Process ID:', process.pid);
  console.log('[Electron] ========================================');

  try {
    sessionsDb.initDb();
    console.log('[Electron] SQLite database initialized');
  } catch (err) {
    console.error('[Electron] Failed to initialize database:', err);
  }

  createWindow();
  createTray();
  registerGlobalShortcuts();

  // Check for an unfinished session left over from a prior run
  maybePromptSessionRecovery().catch((err) => {
    console.error('[Recovery] prompt failed:', err);
  });

  // Verify app is properly initialized
  console.log('[Electron] ========================================');
  console.log('[Electron] App initialization complete');
  console.log('[Electron] Main window:', mainWindow ? 'Created' : 'FAILED');
  console.log('[Electron] Tray icon:', tray ? 'Created' : 'FAILED (will quit on window close)');
  console.log('[Electron] ========================================');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Only keep running if tray exists and is working
  if (tray && !tray.isDestroyed()) {
    console.log('[Electron] All windows closed, app still running in tray');
  } else {
    // No tray available - quit the app to avoid orphaned process
    console.warn('[Electron] All windows closed and no tray available - quitting to avoid orphaned process');
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log('[Electron] ========================================');
  console.log('[Electron] App is quitting...');
  console.log('[Electron] Process ID:', process.pid);
  
  unregisterGlobalShortcuts();
  
  // Destroy all windows
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      console.log('[Electron] Main window destroyed');
    }
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.destroy();
      console.log('[Electron] Toolbar window destroyed');
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.destroy();
      console.log('[Electron] Settings window destroyed');
    }
  } catch (error) {
    console.error('[Electron] Error destroying windows:', error);
  }
  
  // Destroy tray icon to remove it from system tray
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
    console.log('[Electron] Tray icon destroyed');
  }

  // Close database connection
  try {
    sessionsDb.close();
    console.log('[Electron] Database closed');
  } catch (err) {
    console.error('[Electron] Error closing database:', err);
  }

  console.log('[Electron] Cleanup complete - process will exit');
  console.log('[Electron] ========================================');
});

// Handle app quit from tray
app.on('before-quit', () => {
  console.log('[Electron] before-quit event triggered');
  
  // Unregister global shortcuts to prevent memory leaks
  globalShortcut.unregisterAll();
  
  // Remove event listeners from windows to allow clean shutdown
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
  if (toolbarWindow) {
    toolbarWindow.removeAllListeners('close');
  }
});

console.log('[Electron] Main process started');
