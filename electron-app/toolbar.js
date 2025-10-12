/* ============================================
   Toolbar Renderer Process
   Handles toolbar button clicks and syncs with main window
   ============================================ */

const { ipcRenderer } = require('electron');

console.log('[Toolbar] Script loaded');

// DOM Elements - will be populated in init()
let elements = {};

/* ============================================
   Button Handlers
   ============================================ */

function handlePlayPause() {
  console.log('[Toolbar] Play/Pause clicked');
  // Send message to main window via IPC
  ipcRenderer.send('toolbar-action', 'toggle-play');
}

function handleStop() {
  console.log('[Toolbar] Stop clicked');
  ipcRenderer.send('toolbar-action', 'reset');
}

function handleExtend() {
  console.log('[Toolbar] Extend +5 clicked');
  ipcRenderer.send('toolbar-action', 'extend');
}

function handlePreset25() {
  console.log('[Toolbar] ===== Preset 25/5 CLICKED =====');
  
  // Update active state visually
  if (elements.toolbarPreset25Btn) {
    elements.toolbarPreset25Btn.setAttribute('data-active', 'true');
  }
  if (elements.toolbarPreset50Btn) {
    elements.toolbarPreset50Btn.setAttribute('data-active', 'false');
  }
  
  console.log('[Toolbar] Sending preset-25 command to main window');
  ipcRenderer.send('toolbar-action', 'preset-25');
}

function handlePreset50() {
  console.log('[Toolbar] ===== Preset 50/10 CLICKED =====');
  
  // Update active state visually
  if (elements.toolbarPreset25Btn) {
    elements.toolbarPreset25Btn.setAttribute('data-active', 'false');
  }
  if (elements.toolbarPreset50Btn) {
    elements.toolbarPreset50Btn.setAttribute('data-active', 'true');
  }
  
  console.log('[Toolbar] Sending preset-50 command to main window');
  ipcRenderer.send('toolbar-action', 'preset-50');
}

function handleSettings() {
  console.log('[Toolbar] Settings clicked');
  ipcRenderer.send('toolbar-action', 'settings');
}

function handleNotes() {
  console.log('[Toolbar] Notes clicked');
  ipcRenderer.send('toolbar-action', 'notes');
}

/* ============================================
   Update Toolbar State
   ============================================ */

// Listen for state updates from main process
ipcRenderer.on('timer-state-update', (event, state) => {
  console.log('[Toolbar] State update:', state);
  updatePlayButtonIcon(state.runState);
});

// Listen for preset updates from main process
ipcRenderer.on('preset-update', (event, config) => {
  console.log('[Toolbar] Preset update:', config);
  updatePresetButtons(config.workMinutes, config.breakMinutes);
});

function updatePlayButtonIcon(runState) {
  const playBtn = elements.toolbarPlayBtn;
  
  if (runState === 'running') {
    // Show pause icon
    playBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    `;
  } else {
    // Show play icon
    playBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
  }
}

function updatePresetButtons(workMinutes, breakMinutes) {
  // Check if values match a preset
  if (workMinutes === 25 && breakMinutes === 5) {
    elements.toolbarPreset25Btn.setAttribute('data-active', 'true');
    elements.toolbarPreset50Btn.setAttribute('data-active', 'false');
    console.log('[Toolbar] Preset buttons updated: 25/5 active');
  } else if (workMinutes === 50 && breakMinutes === 10) {
    elements.toolbarPreset25Btn.setAttribute('data-active', 'false');
    elements.toolbarPreset50Btn.setAttribute('data-active', 'true');
    console.log('[Toolbar] Preset buttons updated: 50/10 active');
  } else {
    // Custom values - no preset active
    elements.toolbarPreset25Btn.setAttribute('data-active', 'false');
    elements.toolbarPreset50Btn.setAttribute('data-active', 'false');
    console.log('[Toolbar] Preset buttons updated: custom values, no preset active');
  }
}

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Toolbar] Initializing...');
  
  // Populate DOM Elements after DOM is ready
  elements = {
    toolbarPlayBtn: document.getElementById('toolbar-play-btn'),
    toolbarStopBtn: document.getElementById('toolbar-stop-btn'),
    toolbarExtendBtn: document.getElementById('toolbar-extend-btn'),
    toolbarPreset25Btn: document.getElementById('toolbar-preset-25'),
    toolbarPreset50Btn: document.getElementById('toolbar-preset-50'),
    toolbarSettingsBtn: document.getElementById('toolbar-settings-btn'),
    toolbarNotesBtn: document.getElementById('toolbar-notes-btn'),
  };
  
  // Debug: Check if elements were found
  console.log('[Toolbar] Elements found:', {
    preset25: !!elements.toolbarPreset25Btn,
    preset50: !!elements.toolbarPreset50Btn,
  });
  
  // Set up event listeners
  if (elements.toolbarPlayBtn) elements.toolbarPlayBtn.addEventListener('click', handlePlayPause);
  if (elements.toolbarStopBtn) elements.toolbarStopBtn.addEventListener('click', handleStop);
  if (elements.toolbarExtendBtn) elements.toolbarExtendBtn.addEventListener('click', handleExtend);
  if (elements.toolbarPreset25Btn) elements.toolbarPreset25Btn.addEventListener('click', handlePreset25);
  if (elements.toolbarPreset50Btn) elements.toolbarPreset50Btn.addEventListener('click', handlePreset50);
  if (elements.toolbarSettingsBtn) elements.toolbarSettingsBtn.addEventListener('click', handleSettings);
  if (elements.toolbarNotesBtn) elements.toolbarNotesBtn.addEventListener('click', handleNotes);
  
  console.log('[Toolbar] Ready!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

