/* ============================================
   Settings Renderer Process
   Handles settings form and communication
   ============================================ */

const { ipcRenderer } = require('electron');

console.log('[Settings] Script loaded');

// DOM Elements
const form = document.getElementById('settings-form');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');

// Form inputs
const inputs = {
  workMinutes: document.getElementById('work-duration'),
  shortBreakMinutes: document.getElementById('short-break'),
  longBreakMinutes: document.getElementById('long-break'),
  cycleLength: document.getElementById('cycles'),
  soundEnabled: document.getElementById('sound-enabled'),
};

/* ============================================
   Load Current Settings
   ============================================ */

// Request current settings from main process
ipcRenderer.send('settings-get');

// Receive settings and populate form
ipcRenderer.on('settings-data', (event, settings) => {
  console.log('[Settings] Loaded settings:', settings);
  
  if (settings) {
    inputs.workMinutes.value = settings.workMinutes || 25;
    inputs.shortBreakMinutes.value = settings.shortBreakMinutes || 5;
    inputs.longBreakMinutes.value = settings.longBreakMinutes || 15;
    inputs.cycleLength.value = settings.cycleLength || 4;
    inputs.soundEnabled.checked = settings.soundEnabled !== false; // Default true
  }
});

/* ============================================
   Form Handlers
   ============================================ */

function handleSave(event) {
  event.preventDefault();
  console.log('[Settings] Saving settings...');
  
  // Gather form data
  const settings = {
    workMinutes: parseInt(inputs.workMinutes.value, 10),
    shortBreakMinutes: parseInt(inputs.shortBreakMinutes.value, 10),
    longBreakMinutes: parseInt(inputs.longBreakMinutes.value, 10),
    cycleLength: parseInt(inputs.cycleLength.value, 10),
    soundEnabled: inputs.soundEnabled.checked,
  };
  
  // Validate
  if (settings.workMinutes < 1 || settings.workMinutes > 120) {
    alert('Work duration must be between 1 and 120 minutes');
    return;
  }
  if (settings.shortBreakMinutes < 1 || settings.shortBreakMinutes > 30) {
    alert('Short break must be between 1 and 30 minutes');
    return;
  }
  if (settings.longBreakMinutes < 5 || settings.longBreakMinutes > 60) {
    alert('Long break must be between 5 and 60 minutes');
    return;
  }
  if (settings.cycleLength < 1 || settings.cycleLength > 10) {
    alert('Cycles must be between 1 and 10');
    return;
  }
  
  console.log('[Settings] Valid settings:', settings);
  
  // Send to main process
  ipcRenderer.send('settings-save', settings);
  
  // Close window
  window.close();
}

function handleCancel() {
  console.log('[Settings] Cancelled');
  window.close();
}

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Settings] Initializing...');
  
  // Set up event listeners
  form.addEventListener('submit', handleSave);
  cancelBtn.addEventListener('click', handleCancel);
  
  // Request initial settings
  ipcRenderer.send('settings-get');
  
  console.log('[Settings] Ready!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

