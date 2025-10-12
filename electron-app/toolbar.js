/* ============================================
   Toolbar Renderer Process
   Handles toolbar button clicks and syncs with main window
   ============================================ */

const { ipcRenderer } = require('electron');

console.log('[Toolbar] Script loaded');

// DOM Elements
const elements = {
  toolbarPlayBtn: document.getElementById('toolbar-play-btn'),
  toolbarStopBtn: document.getElementById('toolbar-stop-btn'),
  toolbarSettingsBtn: document.getElementById('toolbar-settings-btn'),
  toolbarNotesBtn: document.getElementById('toolbar-notes-btn'),
};

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

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Toolbar] Initializing...');
  
  // Set up event listeners
  elements.toolbarPlayBtn.addEventListener('click', handlePlayPause);
  elements.toolbarStopBtn.addEventListener('click', handleStop);
  elements.toolbarSettingsBtn.addEventListener('click', handleSettings);
  elements.toolbarNotesBtn.addEventListener('click', handleNotes);
  
  console.log('[Toolbar] Ready!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

