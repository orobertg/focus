/* ============================================
   Focus Bubbles - Renderer Process
   ============================================ */

const { ipcRenderer } = require('electron');

// Import Rust core (currently using stub, will be replaced with native addon)
const rustCore = require('./core_stub.js');

// State Management
const state = {
  phase: 'idle', // 'idle', 'focus', 'pause', 'break'
  runState: 'idle', // 'idle', 'running', 'paused'
  millisRemaining: 25 * 60 * 1000, // 25 minutes default
  millisTotal: 25 * 60 * 1000,
  pauseStartTime: null,
  pauseDuration: 0,
  completedPomodoros: 0,
  isInBreakState: false,
  isInCooldown: false,
  cooldownStartTime: null,
  
  // Configuration
  config: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4, // Long break after 4 pomodoros
  }
};

// DOM Elements
const elements = {
  bubble: document.getElementById('timer-bubble'),
  phaseIcon: document.getElementById('phase-icon'),
  timerDisplay: document.getElementById('timer-display'),
  progressDots: document.getElementById('progress-dots'),
  phaseLabel: document.getElementById('phase-label'),
  progressCircle: document.getElementById('progress-circle'),
  startPauseBtn: document.getElementById('start-pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  settingsBtn: document.getElementById('settings-btn'),
};

// Timer interval
let timerInterval = null;
let pauseBlinkInterval = null;

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Renderer] Initializing...');
  
  // Set up event listeners for timer controls
  elements.startPauseBtn.addEventListener('click', handleStartPause);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.settingsBtn.addEventListener('click', handleSettings);
  
  // Listen for toolbar commands via IPC
  ipcRenderer.on('toolbar-command', (event, action) => {
    console.log('[Renderer] Received toolbar command:', action);
    switch (action) {
      case 'toggle-play':
        handleStartPause();
        break;
      case 'reset':
        handleReset();
        break;
      case 'notes':
        handleNotes();
        break;
    }
  });
  
  // Initial render
  updateUI();
  
  console.log('[Renderer] Ready!');
}

function handleNotes() {
  console.log('[Notes] Clicked (TODO: Implement notes panel)');
  // TODO: Open notes panel
}

// Send state updates to toolbar via IPC
function sendStateUpdate() {
  ipcRenderer.send('state-update', {
    runState: state.runState,
    phase: state.phase,
    isInBreakState: state.isInBreakState,
  });
}

/* ============================================
   Timer Logic
   ============================================ */

function handleStartPause() {
  console.log('[Timer] Start/Pause clicked, current state:', state.runState);
  
  if (state.runState === 'idle' || state.runState === 'paused') {
    startTimer();
  } else if (state.runState === 'running') {
    pauseTimer();
  }
  
  sendStateUpdate(); // Notify toolbar
}

function startTimer() {
  console.log('[Timer] Starting timer');
  
  try {
    let snapshot;
    
    // If starting from idle, start work session
    if (state.runState === 'idle') {
      const snapshotJson = rustCore.startWork();
      snapshot = JSON.parse(snapshotJson);
      console.log('[Timer] Started work session:', snapshot);
    } else if (state.runState === 'paused') {
      // Resume from pause
      const snapshotJson = rustCore.resumeTimer();
      snapshot = JSON.parse(snapshotJson);
      console.log('[Timer] Resumed from pause:', snapshot);
    }
    
    // Update state from snapshot
    if (snapshot) {
      updateStateFromSnapshot(snapshot);
    }
    
    // If resuming from break state, reset break indicators
    if (state.isInBreakState) {
      state.isInBreakState = false;
      state.isInCooldown = true;
      state.cooldownStartTime = Date.now();
      stopBreakBlink();
    }
    
    // Clear pause tracking
    state.pauseStartTime = null;
    state.pauseDuration = 0;
    
    // Start ticker
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 250); // 4 ticks per second
    
    updateUI();
  } catch (error) {
    console.error('[Timer] Error starting timer:', error);
  }
}

function pauseTimer() {
  console.log('[Timer] Pausing timer');
  
  try {
    const snapshotJson = rustCore.pauseTimer();
    const snapshot = JSON.parse(snapshotJson);
    console.log('[Timer] Paused:', snapshot);
    
    updateStateFromSnapshot(snapshot);
  } catch (error) {
    console.error('[Timer] Error pausing timer:', error);
  }
  
  state.pauseStartTime = Date.now();
  state.pauseDuration = 0;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Start monitoring pause duration
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  pauseBlinkInterval = setInterval(updatePauseDuration, 250);
  
  updateUI();
}

function handleReset() {
  console.log('[Timer] Reset clicked');
  
  try {
    const snapshotJson = rustCore.stopTimer();
    const snapshot = JSON.parse(snapshotJson);
    console.log('[Timer] Reset/Stopped:', snapshot);
    
    updateStateFromSnapshot(snapshot);
  } catch (error) {
    console.error('[Timer] Error resetting timer:', error);
  }
  
  // Stop all intervals
  if (timerInterval) clearInterval(timerInterval);
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  stopBreakBlink();
  
  // Reset UI state
  state.pauseStartTime = null;
  state.pauseDuration = 0;
  state.isInBreakState = false;
  state.isInCooldown = false;
  state.cooldownStartTime = null;
  
  updateUI();
  sendStateUpdate(); // Notify toolbar
}

function handleSettings() {
  console.log('[Settings] Opening settings panel');
  ipcRenderer.send('settings-open');
}

// Listen for settings updates
ipcRenderer.on('settings-updated', (event, settings) => {
  console.log('[Settings] Settings updated:', settings);
  // Apply new settings to timer
  state.config.workMinutes = settings.workMinutes;
  state.config.shortBreakMinutes = settings.shortBreakMinutes;
  state.config.longBreakMinutes = settings.longBreakMinutes;
  state.config.cycleLength = settings.cycleLength;
  state.config.soundEnabled = settings.soundEnabled;
  
  // If timer is idle, reset to new work duration
  if (state.runState === 'idle') {
    state.millisRemaining = settings.workMinutes * 60 * 1000;
    state.millisTotal = settings.workMinutes * 60 * 1000;
    updateUI();
  }
});

/* ============================================
   Rust Core Integration
   ============================================ */

function updateStateFromSnapshot(snapshot) {
  // Map Rust enum values to JS strings
  state.phase = snapshot.phase.toLowerCase();
  state.runState = snapshot.runState.toLowerCase();
  state.millisTotal = snapshot.millisTotal;
  state.millisRemaining = snapshot.millisTotal - snapshot.millisElapsed;
  
  console.log('[Core] Updated state from snapshot:', {
    phase: state.phase,
    runState: state.runState,
    millisTotal: state.millisTotal,
    millisRemaining: state.millisRemaining,
  });
}

/* ============================================
   Timer Tick
   ============================================ */

function tick() {
  if (state.runState !== 'running') return;
  
  try {
    // Get latest snapshot from Rust core
    const snapshotJson = rustCore.getSnapshot();
    const snapshot = JSON.parse(snapshotJson);
    updateStateFromSnapshot(snapshot);
    
    // Check if phase is complete
    if (state.millisRemaining <= 0) {
      onPhaseComplete();
    }
  } catch (error) {
    console.error('[Timer] Error in tick:', error);
  }
  
  // Update cooldown if active
  if (state.isInCooldown) {
    updateCooldown();
  }
  
  updateUI();
}

function onPhaseComplete() {
  console.log('[Timer] Phase complete:', state.phase);
  
  if (state.phase === 'focus') {
    state.completedPomodoros++;
    console.log('[Timer] Completed pomodoros:', state.completedPomodoros);
    
    // Transition to break (just set to idle for now, user can start break manually)
    state.runState = 'idle';
    state.phase = 'idle';
    state.millisRemaining = state.config.workMinutes * 60 * 1000;
    state.millisTotal = state.config.workMinutes * 60 * 1000;
    
    if (timerInterval) clearInterval(timerInterval);
  }
  
  updateUI();
}

/* ============================================
   Pause Duration Tracking
   ============================================ */

function updatePauseDuration() {
  if (state.runState !== 'paused' || !state.pauseStartTime) return;
  
  state.pauseDuration = Math.floor((Date.now() - state.pauseStartTime) / 1000);
  
  // Transition to break after 60 seconds
  if (state.pauseDuration >= 60 && !state.isInBreakState) {
    console.log('[Timer] Transitioning to BREAK state');
    state.isInBreakState = true;
    state.phase = 'break';
    startBreakBlink();
  }
  
  updateUI();
}

let breakBlinkInterval = null;
let dotsVisible = true;

function startBreakBlink() {
  if (breakBlinkInterval) return;
  
  breakBlinkInterval = setInterval(() => {
    dotsVisible = !dotsVisible;
    updateUI();
  }, 500);
}

function stopBreakBlink() {
  if (breakBlinkInterval) {
    clearInterval(breakBlinkInterval);
    breakBlinkInterval = null;
  }
  dotsVisible = true;
}

/* ============================================
   Cooldown (after resuming from break)
   ============================================ */

function updateCooldown() {
  if (!state.isInCooldown || !state.cooldownStartTime) return;
  
  const cooldownElapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
  
  if (cooldownElapsed >= 60) {
    // Cooldown complete
    state.isInCooldown = false;
    state.cooldownStartTime = null;
    console.log('[Timer] Cooldown complete');
  }
}

/* ============================================
   UI Updates
   ============================================ */

function updateUI() {
  updateTimerDisplay();
  updatePhaseIcon();
  updateProgressRing();
  updateProgressDots();
  updatePhaseLabel();
  updateStartPauseButton();
  updateBubbleClass();
}

function updateTimerDisplay() {
  const totalSeconds = Math.ceil(state.millisRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  elements.timerDisplay.textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updatePhaseIcon() {
  const isIdle = state.runState === 'idle';
  const isPaused = state.runState === 'paused' && !state.isInBreakState;
  const isBreak = state.isInBreakState;
  const isFocus = state.phase === 'focus' && state.runState === 'running';
  
  let iconSVG = '';
  
  if (isIdle || isPaused) {
    // Closed eye icon
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    `;
  } else if (isBreak) {
    // Coffee mug icon
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    `;
  } else if (isFocus) {
    // Open eye icon
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
  }
  
  elements.phaseIcon.innerHTML = iconSVG;
}

function updateProgressRing() {
  const radius = 75; // Adjusted for smaller ring
  const circumference = 2 * Math.PI * radius;
  
  let progress = 0;
  if (state.millisTotal > 0) {
    progress = 1 - (state.millisRemaining / state.millisTotal);
  }
  
  const offset = circumference * (1 - progress);
  elements.progressCircle.style.strokeDashoffset = offset;
  
  // Update color based on phase
  if (state.isInBreakState) {
    elements.progressCircle.style.stroke = '#14b8a6'; // Teal for break
  } else if (state.phase === 'focus' && state.runState === 'running') {
    elements.progressCircle.style.stroke = '#ef4444'; // Red for focus
  } else {
    elements.progressCircle.style.stroke = 'rgba(255, 255, 255, 0.3)'; // Gray for idle
  }
}

function updateProgressDots() {
  const dots = elements.progressDots.querySelectorAll('.dot');
  const isPaused = state.runState === 'paused';
  const isBreak = state.isInBreakState;
  const isInCooldown = state.isInCooldown;
  
  // Calculate how many dots to light up
  let litDotsCount = 0;
  
  if (isPaused && !isBreak) {
    // Light up dots based on pause duration (every 15 seconds)
    litDotsCount = Math.min(Math.floor(state.pauseDuration / 15), 4);
  } else if (isInCooldown) {
    // During cooldown, dots reset from right to left
    const cooldownElapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
    const dotsToReset = Math.min(Math.floor(cooldownElapsed / 15), 4);
    litDotsCount = 4 - dotsToReset;
  } else {
    // Show completed pomodoros
    litDotsCount = Math.min(state.completedPomodoros % 4, 4);
  }
  
  dots.forEach((dot, index) => {
    dot.className = 'dot'; // Reset classes
    
    if (index < litDotsCount) {
      if (isPaused || isBreak) {
        dot.classList.add('lit-yellow');
      } else {
        dot.classList.add('lit');
      }
    }
    
    // Blinking during break
    if (isBreak && dotsVisible && index < litDotsCount) {
      dot.classList.add('blink');
    }
  });
}

function updatePhaseLabel() {
  const isPaused = state.runState === 'paused' && !state.isInBreakState;
  const isBreak = state.isInBreakState;
  
  if (isPaused) {
    elements.phaseLabel.textContent = 'PAUSE';
  } else if (isBreak) {
    elements.phaseLabel.textContent = 'BREAK';
  } else if (state.phase === 'focus') {
    elements.phaseLabel.textContent = 'FOCUS';
  } else {
    elements.phaseLabel.textContent = 'READY';
  }
}

function updateStartPauseButton() {
  if (state.runState === 'running') {
    elements.startPauseBtn.textContent = 'PAUSE';
  } else {
    elements.startPauseBtn.textContent = 'START';
  }
}

function updateBubbleClass() {
  elements.bubble.className = 'bubble';
  
  if (state.phase === 'focus' && state.runState === 'running') {
    elements.bubble.classList.add('phase-focus');
  } else if (state.isInBreakState) {
    elements.bubble.classList.add('phase-break');
  } else {
    elements.bubble.classList.add('phase-idle');
  }
}

/* ============================================
   Start Application
   ============================================ */

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[Renderer] Script loaded');

