/* ============================================
   Focus Bubbles - Renderer Process
   ============================================ */

const { ipcRenderer } = require('electron');

// Import Rust core (currently using stub, will be replaced with native addon)
const rustCore = require('./core_stub.js');

// State Management
const state = {
  phase: 'idle', // 'idle', 'focus', 'pause', 'break', 'reflect'
  runState: 'idle', // 'idle', 'running', 'paused'
  millisRemaining: 25 * 60 * 1000, // 25 minutes default
  millisTotal: 25 * 60 * 1000,
  pauseStartTime: null,
  pauseDuration: 0,
  
  // Pomodoro tracking
  completedPomodoros: 0, // 0-4, tracks green dots
  pomodorosCycleCount: 0, // Total in current cycle
  
  // Break warm-up (pause → break transition)
  pauseWarmUpProgress: 0, // 0-4, yellow dots filling during pause
  warmUpIntervalId: null,
  
  // Break state
  isInBreakState: false,
  
  // Break cool-down (break → focus transition)
  isInCooldown: false,
  cooldownStartTime: null,
  cooldownProgress: 0, // 0-4, yellow dots clearing right-to-left
  cooldownIntervalId: null,
  
  // Reflection period (after 4 pomodoros)
  inReflectionPeriod: false,
  reflectionStartTime: null,
  reflectionMinMinutes: 10,
  
  // Configuration
  config: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4, // Long break after 4 pomodoros
    warmUpSeconds: 60, // Time to transition to break (15s per dot)
    coolDownSeconds: 60, // Time to transition from break (15s per dot)
  }
};

// Focus Management State
const focusState = {
  currentContext: 'timer', // 'timer' or 'settings'
  timerFocusIndex: 0,
  settingsFocusIndex: 0,
  timerFocusableElements: [],
  settingsFocusableElements: [], // Filtered by current tab
  allSettingsControls: [], // All controls from all tabs
  currentTabIndex: 0, // 0=duration, 1=options, 2=notifications
  tabs: ['duration', 'options', 'notifications'],
};

// DOM Elements
const elements = {
  panelsContainer: document.getElementById('panels-container'),
  timerPanel: document.getElementById('timer-panel'),
  settingsPanel: document.getElementById('settings-panel'),
  bubble: document.getElementById('timer-bubble'),
  phaseIcon: document.getElementById('phase-icon'),
  timerDisplay: document.getElementById('timer-display'),
  progressDots: document.getElementById('progress-dots'),
  phaseLabel: document.getElementById('phase-label'),
  progressCircle: document.getElementById('progress-circle'),
  startPauseBtn: document.getElementById('start-pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  tabDuration: document.getElementById('tab-duration'),
  tabOptions: document.getElementById('tab-options'),
  tabNotifications: document.getElementById('tab-notifications'),
  contentDuration: document.getElementById('content-duration'),
  contentOptions: document.getElementById('content-options'),
  contentNotifications: document.getElementById('content-notifications'),
  workMinutesValue: document.getElementById('work-minutes-value'),
  workMinutesPrev: document.getElementById('work-minutes-prev'),
  workMinutesNext: document.getElementById('work-minutes-next'),
  shortBreakMinutesValue: document.getElementById('short-break-minutes-value'),
  shortBreakMinutesPrev: document.getElementById('short-break-minutes-prev'),
  shortBreakMinutesNext: document.getElementById('short-break-minutes-next'),
  longBreakMinutesValue: document.getElementById('long-break-minutes-value'),
  longBreakMinutesPrev: document.getElementById('long-break-minutes-prev'),
  longBreakMinutesNext: document.getElementById('long-break-minutes-next'),
  cycleLengthValue: document.getElementById('cycle-length-value'),
  cycleLengthPrev: document.getElementById('cycle-length-prev'),
  cycleLengthNext: document.getElementById('cycle-length-next'),
  soundEnabledInput: document.getElementById('sound-enabled'),
  autoStartBreaksInput: document.getElementById('auto-start-breaks'),
  autoStartPomodorosInput: document.getElementById('auto-start-pomodoros'),
  showNotificationsInput: document.getElementById('show-notifications'),
  alwaysOnTopToggle: document.getElementById('always-on-top-toggle'),
};

// Timer interval
let timerInterval = null;
let pauseBlinkInterval = null;

/* ============================================
   Global Functions (Must be available immediately)
   ============================================ */

// Expose closeSettings globally for inline onclick handler
// This MUST be defined before init() runs so it's available immediately
window.closeSettings = function() {
  console.log('[Settings] Close button clicked via global inline handler');
  
  // Get elements directly (don't rely on cached elements object)
  const panelsContainer = document.getElementById('panels-container');
  if (panelsContainer) {
    panelsContainer.classList.remove('show-settings');
    console.log('[Settings] Removed show-settings class via global handler');
  }
  
  // Try to call saveSettings if it exists
  if (typeof saveSettings === 'function') {
    saveSettings();
  }
};

/* ============================================
   Initialization
   ============================================ */

function init() {
  console.log('[Renderer] Initializing...');
  
  // Load saved settings
  loadSettings();
  
  // Set up event listeners for timer controls
  elements.startPauseBtn.addEventListener('click', handleStartPause);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.settingsBtn.addEventListener('click', () => showSettings());
  
  // Close settings button - use multiple strategies to ensure it works
  
  // Strategy 1: Event delegation on document (always works)
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('#close-settings-btn');
    if (closeBtn) {
      console.log('[Settings] Close button clicked via delegation');
      e.preventDefault();
      e.stopPropagation();
      hideSettings();
    }
  }, true); // Use capture phase for better reliability
  
  // Strategy 2: Direct listener on settings panel (catches bubbled events)
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) {
    settingsPanel.addEventListener('click', (e) => {
      if (e.target.id === 'close-settings-btn' || e.target.closest('#close-settings-btn')) {
        console.log('[Settings] Close button clicked via settings panel');
        e.preventDefault();
        e.stopPropagation();
        hideSettings();
      }
    });
  }
  
  // Strategy 3: Direct listener with immediate and delayed attachment
  const attachDirectListener = () => {
    const closeBtnElement = document.getElementById('close-settings-btn');
    if (closeBtnElement) {
      // Remove any existing listeners to avoid duplicates
      const newCloseBtn = closeBtnElement.cloneNode(true);
      closeBtnElement.parentNode.replaceChild(newCloseBtn, closeBtnElement);
      
      // Attach new listener
      newCloseBtn.addEventListener('click', (e) => {
        console.log('[Settings] Close button clicked directly');
        e.preventDefault();
        e.stopPropagation();
        hideSettings();
      }, true);
      
      console.log('[Settings] Close button listener attached/refreshed');
    } else {
      console.error('[Settings] Close button element not found!');
    }
  };
  
  // Attach immediately
  attachDirectListener();
  
  // Also attach after a delay as backup
  setTimeout(attachDirectListener, 100);
  
  // Set up settings tabs
  elements.tabDuration.addEventListener('click', () => switchTab('duration'));
  elements.tabOptions.addEventListener('click', () => switchTab('options'));
  elements.tabNotifications.addEventListener('click', () => switchTab('notifications'));
  
  // Set up slider listeners for real-time updates
  setupSliderListeners();
  
  // Initialize focusable elements
  initializeFocusManagement();
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    handleKeyboardNavigation(e);
  });
  
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
      case 'extend':
        handleExtend();
        break;
      case 'preset-25':
        applyPreset(25, 5);
        break;
      case 'preset-50':
        applyPreset(50, 10);
        break;
      case 'notes':
        handleNotes();
        break;
      case 'settings':
        showSettings();
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
  
  // Check if in reflection period
  if (state.inReflectionPeriod) {
    const reflectionElapsed = (Date.now() - state.reflectionStartTime) / 1000 / 60; // minutes
    if (reflectionElapsed < state.reflectionMinMinutes) {
      const remaining = Math.ceil(state.reflectionMinMinutes - reflectionElapsed);
      console.log(`[Timer] Still in reflection period. Please wait ${remaining} more minutes.`);
      alert(`Reflection period in progress.\n\nPlease take a ${remaining}-minute break before starting a new cycle.`);
      return;
    } else {
      // End reflection period and start new cycle
      console.log('[Timer] Reflection period complete. Starting new cycle.');
      state.inReflectionPeriod = false;
      state.reflectionStartTime = null;
      state.completedPomodoros = 0;
      state.pomodorosCycleCount = 0;
      state.phase = 'focus';
    }
  }
  
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
    
    // If resuming from break state, start cool-down
    if (state.isInBreakState) {
      state.isInBreakState = false;
      state.isInCooldown = true;
      state.cooldownStartTime = Date.now();
      state.cooldownProgress = 0;
      startCoolDown();
      stopBreakBlink();
    }
    
    // Clear pause tracking
    state.pauseStartTime = null;
    state.pauseDuration = 0;
    state.pauseWarmUpProgress = 0;
    
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

function handleExtend() {
  console.log('[Timer] Extend +5 clicked');
  
  // Can only extend when timer is running or paused (not idle)
  if (state.runState === 'idle') {
    console.log('[Timer] Cannot extend - timer is idle');
    return;
  }
  
  // Add 5 minutes (300,000 milliseconds)
  const extensionMillis = 5 * 60 * 1000;
  state.millisRemaining += extensionMillis;
  state.millisTotal += extensionMillis;
  
  console.log(`[Timer] Extended by 5 minutes. New total: ${Math.ceil(state.millisRemaining / 1000 / 60)} minutes`);
  
  // Update UI
  updateUI();
}

// Settings are now handled inline - see Settings Panel section below

// (Old settings IPC listener - can be removed)
ipcRenderer.on('settings-updated', (event, settings) => {
  console.log('[Settings] Settings updated (legacy):', settings);
  // Settings are now handled via local panel
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
    state.pomodorosCycleCount++;
    console.log(`[Timer] Completed pomodoros: ${state.completedPomodoros}/4 (cycle: ${state.pomodorosCycleCount})`);
    
    // Check if we've completed 4 pomodoros
    if (state.completedPomodoros >= 4) {
      console.log('[Timer] 4 pomodoros completed! Entering REFLECT period');
      state.inReflectionPeriod = true;
      state.reflectionStartTime = Date.now();
      state.phase = 'reflect';
      state.completedPomodoros = 4; // Keep at 4 to show all green dots
    } else {
      state.phase = 'focus'; // Stay in focus phase for next pomodoro
    }
    
    // Stop timer
    state.runState = 'idle';
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
  
  // Update warm-up progress (fill dots every 15 seconds)
  const warmUpProgress = Math.min(Math.floor(state.pauseDuration / 15), 4);
  if (warmUpProgress !== state.pauseWarmUpProgress) {
    state.pauseWarmUpProgress = warmUpProgress;
    console.log(`[Timer] Warm-up progress: ${warmUpProgress}/4 dots`);
  }
  
  // Transition to break after 60 seconds (all 4 dots yellow)
  if (state.pauseDuration >= 60 && !state.isInBreakState) {
    console.log('[Timer] Transitioning to BREAK state');
    state.isInBreakState = true;
    state.phase = 'break';
    state.pauseWarmUpProgress = 0; // Reset warm-up
    // Note: dots will blink via CSS, no need for interval
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

function startCoolDown() {
  console.log('[Timer] Starting cool-down sequence (60s to clear yellow dots right-to-left)');
  
  // Clear any existing cool-down interval
  if (state.cooldownIntervalId) {
    clearInterval(state.cooldownIntervalId);
    state.cooldownIntervalId = null;
  }
  
  // Note: Cool-down progress is updated by updateCooldown() which is called from tick()
  // This ensures smooth animation as part of the main timer loop
}

function stopCoolDown() {
  console.log('[Timer] Stopping cool-down');
  
  if (state.cooldownIntervalId) {
    clearInterval(state.cooldownIntervalId);
    state.cooldownIntervalId = null;
  }
  
  state.isInCooldown = false;
  state.cooldownProgress = 0;
  state.cooldownStartTime = null;
  
  updateUI();
}

function updateCooldown() {
  if (!state.isInCooldown || !state.cooldownStartTime) return;
  
  const cooldownElapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
  const newProgress = Math.min(Math.floor(cooldownElapsed / 15), 4);
  
  // Update progress if it changed
  if (newProgress !== state.cooldownProgress) {
    state.cooldownProgress = newProgress;
    console.log(`[Timer] Cool-down progress: ${newProgress}/4 dots cleared (right-to-left)`);
  }
  
  // Complete cooldown after 60 seconds
  if (cooldownElapsed >= 60) {
    console.log('[Timer] Cool-down complete - all dots returned to original state');
    stopCoolDown();
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
  const isRunning = state.runState === 'running';
  const isReflection = state.inReflectionPeriod;
  
  let iconSVG = '';
  
  if (isReflection) {
    // Blue star icon (celebration of completing 4 pomodoros!)
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
  } else if (isBreak) {
    // Coffee mug icon (during break)
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    `;
  } else if (isRunning) {
    // Open eye icon (timer is counting down)
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
  } else {
    // Closed eye icon (idle or paused)
    iconSVG = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
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
  
  // Priority order for dot states:
  // 1. Cool-down yellow (clearing right-to-left, restoring green underneath)
  // 2. Warm-up yellow (filling left-to-right, overlaying green)
  // 3. Break yellow blinking (all 4)
  // 4. Completed green (solid)
  // 5. Default gray (unfilled)
  
  dots.forEach((dot, index) => {
    dot.className = 'dot'; // Reset classes
    
    // First, always show the base green dots for completed pomodoros
    const isCompletedPomodoro = index < state.completedPomodoros;
    if (isCompletedPomodoro) {
      dot.classList.add('lit-green');
    }
    
    // Then overlay special states on top
    
    // Check cool-down state (clearing yellow from right to left)
    if (state.isInCooldown) {
      // Yellow dots remain on the LEFT side (haven't been cleared yet)
      // Cool-down clears from right to left every 15 seconds
      // Progress: 0 = all 4 yellow, 1 = 3 yellow, 2 = 2 yellow, 3 = 1 yellow, 4 = 0 yellow
      const remainingYellowDots = 4 - state.cooldownProgress;
      if (index < remainingYellowDots) {
        // Override with yellow (this dot hasn't cleared yet)
        dot.classList.remove('lit-green');
        dot.classList.add('lit-yellow');
      }
      // Else: keep the green if it was a completed pomodoro (dots restore right-to-left)
    }
    // Check warm-up state (filling yellow from left to right)
    else if (state.runState === 'paused' && !state.isInBreakState && state.pauseWarmUpProgress > 0) {
      // Yellow dots fill from left to right
      if (index < state.pauseWarmUpProgress) {
        // Override with yellow (warm-up in progress)
        dot.classList.remove('lit-green');
        dot.classList.add('lit-yellow');
      }
      // Else: keep the green if it was a completed pomodoro
    }
    // Check break state (all 4 yellow blinking, overrides everything)
    else if (state.isInBreakState) {
      dot.classList.remove('lit-green');
      dot.classList.add('lit-yellow');
      dot.classList.add('blink');
    }
    // Check reflection period (force all 4 to green)
    else if (state.inReflectionPeriod) {
      // Show all 4 green dots during reflection
      if (index < 4) {
        dot.classList.remove('lit-yellow');
        dot.classList.add('lit-green');
      }
    }
  });
}

function updatePhaseLabel() {
  const isPaused = state.runState === 'paused' && !state.isInBreakState;
  const isBreak = state.isInBreakState;
  const isReflection = state.inReflectionPeriod;
  
  if (isReflection) {
    elements.phaseLabel.textContent = 'REFLECT';
  } else if (isPaused) {
    elements.phaseLabel.textContent = 'PAUSE';
  } else if (isBreak) {
    elements.phaseLabel.textContent = 'BREAK';
  } else {
    // Show "FOCUS" for any focus/work phase (running or idle)
    elements.phaseLabel.textContent = 'FOCUS';
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
   Timer Presets
   ============================================ */

function applyPreset(workMinutes, breakMinutes) {
  console.log(`[Preset] Applying ${workMinutes}/${breakMinutes} preset`);
  
  // Only allow preset changes when timer is idle or stopped
  if (state.runState !== 'idle') {
    console.log('[Preset] Timer is running, stopping first...');
    handleReset();
  }
  
  // Update config
  state.config.workMinutes = workMinutes;
  state.config.shortBreakMinutes = breakMinutes;
  
  // Update timer
  state.millisRemaining = workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  
  // Update UI
  updateUI();
  
  console.log(`[Preset] Applied: ${workMinutes} min work, ${breakMinutes} min break`);
}

/* ============================================
   Settings Panel
   ============================================ */

function showSettings() {
  console.log('[Settings] Opening settings panel');
  
  elements.panelsContainer.classList.add('show-settings');
  
  // Clean up ALL timer button focus indicators when opening settings
  focusState.timerFocusableElements.forEach(el => {
    if (el) el.classList.remove('keyboard-focus');
  });
  
  // Reset to Duration tab by default
  focusState.currentTabIndex = 0;
  focusState.settingsFocusIndex = 0;
  switchTab('duration');
  
  // Re-initialize focusable elements to ensure proper filtering
  initializeFocusManagement();
  
  // Add focus to first control in DURATION tab
  if (focusState.settingsFocusableElements.length > 0) {
    addFocusToSettingsControl(focusState.settingsFocusableElements[0]);
    console.log('[Settings] Initial focus on:', focusState.settingsFocusableElements[0].name);
  }
  
  // Populate settings with current values
  updateSliderValues();
  elements.soundEnabledInput.checked = state.config.soundEnabled || false;
  elements.alwaysOnTopToggle.checked = state.config.alwaysOnTop || false;
  elements.autoStartBreaksInput.checked = state.config.autoStartBreaks !== undefined ? state.config.autoStartBreaks : true;
  elements.autoStartPomodorosInput.checked = state.config.autoStartPomodoros || false;
  elements.showNotificationsInput.checked = state.config.showNotifications !== undefined ? state.config.showNotifications : true;
  
  // Ensure close button is clickable by refreshing listener
  setTimeout(() => {
    const closeBtn = document.getElementById('close-settings-btn');
    if (closeBtn) {
      console.log('[Settings] Close button is in DOM and ready');
      console.log('[Settings] Close button offsetParent:', closeBtn.offsetParent);
      console.log('[Settings] Close button getBoundingClientRect:', closeBtn.getBoundingClientRect());
    }
  }, 50);
}

function hideSettings() {
  console.log('[Settings] Closing settings panel');
  
  // Remove focus from current control
  if (focusState.settingsFocusableElements.length > 0 && 
      focusState.settingsFocusableElements[focusState.settingsFocusIndex]) {
    removeFocusFromSettingsControl(focusState.settingsFocusableElements[focusState.settingsFocusIndex]);
  }
  
  // Auto-save settings when closing
  saveSettings();
  
  // Remove the show-settings class
  if (elements.panelsContainer) {
    elements.panelsContainer.classList.remove('show-settings');
    console.log('[Settings] Removed show-settings class');
    console.log('[Settings] Current classes:', elements.panelsContainer.className);
  } else {
    console.error('[Settings] panelsContainer element not found!');
  }
  
  // Clean up ALL timer button focus indicators before resetting
  focusState.timerFocusableElements.forEach(el => {
    if (el) el.classList.remove('keyboard-focus');
  });
  
  // Reset timer focus to START button (middle button, index 1) when returning to timer
  focusState.timerFocusIndex = 1;
  console.log('[Settings] Panel closed - timer focus reset to START button, all visual indicators cleared');
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.settings-tab').forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update tab content
  document.querySelectorAll('.settings-tab-content').forEach(content => {
    if (content.id === `content-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

function setupSliderListeners() {
  // Work minutes buttons
  elements.workMinutesPrev.addEventListener('click', () => {
    let value = parseInt(elements.workMinutesValue.textContent);
    if (value > 5) {
      value -= 5;
      elements.workMinutesValue.textContent = value.toString().padStart(2, '0');
      autoSaveSettings();
    }
  });
  elements.workMinutesNext.addEventListener('click', () => {
    let value = parseInt(elements.workMinutesValue.textContent);
    if (value < 90) {
      value += 5;
      elements.workMinutesValue.textContent = value.toString().padStart(2, '0');
      autoSaveSettings();
    }
  });
  
  // Short break buttons
  elements.shortBreakMinutesPrev.addEventListener('click', () => {
    let value = parseInt(elements.shortBreakMinutesValue.textContent);
    if (value > 1) {
      value -= 1;
      elements.shortBreakMinutesValue.textContent = value.toString().padStart(2, '0');
      autoSaveSettings();
    }
  });
  elements.shortBreakMinutesNext.addEventListener('click', () => {
    let value = parseInt(elements.shortBreakMinutesValue.textContent);
    if (value < 30) {
      value += 1;
      elements.shortBreakMinutesValue.textContent = value.toString().padStart(2, '0');
      autoSaveSettings();
    }
  });
  
  // Long break buttons
  elements.longBreakMinutesPrev.addEventListener('click', () => {
    let value = parseInt(elements.longBreakMinutesValue.textContent);
    if (value > 5) {
      value -= 5;
      elements.longBreakMinutesValue.textContent = value;
      autoSaveSettings();
    }
  });
  elements.longBreakMinutesNext.addEventListener('click', () => {
    let value = parseInt(elements.longBreakMinutesValue.textContent);
    if (value < 60) {
      value += 5;
      elements.longBreakMinutesValue.textContent = value;
      autoSaveSettings();
    }
  });
  
  // Cycle length buttons
  elements.cycleLengthPrev.addEventListener('click', () => {
    let value = parseInt(elements.cycleLengthValue.textContent);
    if (value > 1) {
      value -= 1;
      elements.cycleLengthValue.textContent = value;
      autoSaveSettings();
    }
  });
  elements.cycleLengthNext.addEventListener('click', () => {
    let value = parseInt(elements.cycleLengthValue.textContent);
    if (value < 10) {
      value += 1;
      elements.cycleLengthValue.textContent = value;
      autoSaveSettings();
    }
  });
  
  // Toggle switches
  elements.soundEnabledInput.addEventListener('change', autoSaveSettings);
  elements.autoStartBreaksInput.addEventListener('change', autoSaveSettings);
  elements.autoStartPomodorosInput.addEventListener('change', autoSaveSettings);
  elements.showNotificationsInput.addEventListener('change', autoSaveSettings);
  elements.alwaysOnTopToggle.addEventListener('change', autoSaveSettings);
}

function updateSliderValues() {
  elements.workMinutesValue.textContent = state.config.workMinutes.toString().padStart(2, '0');
  elements.shortBreakMinutesValue.textContent = state.config.shortBreakMinutes.toString().padStart(2, '0');
  elements.longBreakMinutesValue.textContent = state.config.longBreakMinutes;
  elements.cycleLengthValue.textContent = state.config.cycleLength;
}

function autoSaveSettings() {
  // Debounce auto-save to avoid excessive saves
  clearTimeout(autoSaveSettings.timeout);
  autoSaveSettings.timeout = setTimeout(() => {
    saveSettingsQuiet();
  }, 500);
}

function saveSettings() {
  saveSettingsQuiet();
  console.log('[Settings] Saved and closed');
}

function saveSettingsQuiet() {
  // Read values from display elements
  const newConfig = {
    workMinutes: parseInt(elements.workMinutesValue.textContent, 10),
    shortBreakMinutes: parseInt(elements.shortBreakMinutesValue.textContent, 10),
    longBreakMinutes: parseInt(elements.longBreakMinutesValue.textContent, 10),
    cycleLength: parseInt(elements.cycleLengthValue.textContent, 10),
    soundEnabled: elements.soundEnabledInput.checked,
    autoStartBreaks: elements.autoStartBreaksInput.checked,
    autoStartPomodoros: elements.autoStartPomodorosInput.checked,
    showNotifications: elements.showNotificationsInput.checked,
    alwaysOnTop: elements.alwaysOnTopToggle.checked,
  };
  
  // Update state
  state.config = newConfig;
  
  // Reset timer if idle
  if (state.runState === 'idle') {
    state.millisRemaining = newConfig.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
  }
  
  // Save to localStorage
  localStorage.setItem('focus-config', JSON.stringify(newConfig));
  
  // Send to main process for immediate window update
  ipcRenderer.send('settings-save', newConfig);
}

function loadSettings() {
  const saved = localStorage.getItem('focus-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      state.config = {
        workMinutes: config.workMinutes || 25,
        shortBreakMinutes: config.shortBreakMinutes || 5,
        longBreakMinutes: config.longBreakMinutes || 15,
        cycleLength: config.cycleLength || 4,
        soundEnabled: config.soundEnabled !== undefined ? config.soundEnabled : true,
        autoStartBreaks: config.autoStartBreaks !== undefined ? config.autoStartBreaks : true,
        autoStartPomodoros: config.autoStartPomodoros || false,
        showNotifications: config.showNotifications !== undefined ? config.showNotifications : true,
        alwaysOnTop: config.alwaysOnTop || false, // Default to false
      };
      console.log('[Settings] Loaded from localStorage:', state.config);
      
      // Apply loaded settings to timer - always update on startup
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
      updateTimerDisplay();
      updateProgressRing();
      console.log('[Settings] Applied work duration to timer on startup:', state.config.workMinutes, 'minutes');
      
      // Send to main process on startup
      ipcRenderer.send('settings-save', state.config);
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
      // Fall back to defaults
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
      updateTimerDisplay();
      updateProgressRing();
    }
  } else {
    // No saved settings, set initial timer with defaults
    console.log('[Settings] No saved settings found, using defaults:', state.config);
    state.millisRemaining = state.config.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
  }
}

/* ============================================
   Window Collapse/Expand Handling
   ============================================ */

// Listen for collapse/expand events from main process
ipcRenderer.on('window-collapsed', (event, data) => {
  console.log('[Window] Window collapsed to', data.edge);
  showCollapsedHandle(data.edge);
});

ipcRenderer.on('window-expanded', () => {
  console.log('[Window] Window expanded');
  hideCollapsedHandle();
});

function showCollapsedHandle(edge) {
  // Hide main content
  if (elements.panelsContainer) {
    elements.panelsContainer.style.display = 'none';
  }
  
  // Show collapsed handle
  let handle = document.getElementById('collapsed-handle');
  if (!handle) {
    handle = document.createElement('div');
    handle.id = 'collapsed-handle';
    handle.innerHTML = '<div class="handle-grip">⋮⋮⋮</div>';
    document.body.appendChild(handle);
  }
  
  // Style based on edge
  handle.className = 'collapsed-handle collapsed-handle-' + edge;
  handle.style.display = 'flex';
}

function hideCollapsedHandle() {
  // Show main content
  if (elements.panelsContainer) {
    elements.panelsContainer.style.display = 'block';
  }
  
  // Hide collapsed handle
  const handle = document.getElementById('collapsed-handle');
  if (handle) {
    handle.style.display = 'none';
  }
}

// Add double-click handler to window
document.addEventListener('dblclick', (event) => {
  // Don't trigger on buttons or inputs
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') {
    return;
  }
  
  console.log('[Window] Double-click detected');
  ipcRenderer.send('window-double-click');
});

/* ============================================
   Keyboard Navigation System
   ============================================ */

function initializeFocusManagement() {
  console.log('[Focus] Initializing keyboard navigation');
  
  // Timer screen focusable elements (horizontal navigation)
  // Order matches visual layout: Reset (left) - Start (center) - Settings (right)
  focusState.timerFocusableElements = [
    elements.resetBtn,
    elements.startPauseBtn,
    elements.settingsBtn,
  ].filter(el => el !== null);
  
  // Set default focus to START button (middle button, index 1)
  focusState.timerFocusIndex = 1;
  
  // Settings screen focusable elements (vertical navigation)
  // These are the interactive controls that can be navigated, organized by tab
  const allSettingsControls = [
    // DURATION tab
    { type: 'duration', tab: 'duration', name: 'Work Duration', valueEl: elements.workMinutesValue, prevBtn: elements.workMinutesPrev, nextBtn: elements.workMinutesNext, min: 5, max: 90, step: 5 },
    { type: 'duration', tab: 'duration', name: 'Short Break', valueEl: elements.shortBreakMinutesValue, prevBtn: elements.shortBreakMinutesPrev, nextBtn: elements.shortBreakMinutesNext, min: 1, max: 30, step: 1 },
    { type: 'duration', tab: 'duration', name: 'Long Break', valueEl: elements.longBreakMinutesValue, prevBtn: elements.longBreakMinutesPrev, nextBtn: elements.longBreakMinutesNext, min: 5, max: 60, step: 5 },
    { type: 'duration', tab: 'duration', name: 'Cycle Length', valueEl: elements.cycleLengthValue, prevBtn: elements.cycleLengthPrev, nextBtn: elements.cycleLengthNext, min: 1, max: 10, step: 1 },
    // OPTIONS tab
    { type: 'toggle', tab: 'options', name: 'Sound', element: elements.soundEnabledInput },
    { type: 'toggle', tab: 'options', name: 'Auto-start Breaks', element: elements.autoStartBreaksInput },
    { type: 'toggle', tab: 'options', name: 'Auto-start Pomodoros', element: elements.autoStartPomodorosInput },
    { type: 'toggle', tab: 'options', name: 'Always on Top', element: elements.alwaysOnTopToggle },
    // NOTIFICATIONS tab
    { type: 'toggle', tab: 'notifications', name: 'Show Notifications', element: elements.showNotificationsInput },
  ].filter(item => {
    if (item.type === 'duration') {
      return item.valueEl !== null;
    } else {
      return item.element !== null;
    }
  });
  
  // Store all controls
  focusState.allSettingsControls = allSettingsControls;
  
  // Filter to current tab
  focusState.settingsFocusableElements = allSettingsControls.filter(
    item => item.tab === focusState.tabs[focusState.currentTabIndex]
  );
  
  console.log(`[Focus] Initialized ${focusState.timerFocusableElements.length} timer controls`);
  console.log(`[Focus] Initialized ${focusState.allSettingsControls.length} total settings controls (${focusState.settingsFocusableElements.length} in current tab: ${focusState.tabs[focusState.currentTabIndex]})`);
}

function handleKeyboardNavigation(e) {
  const isSettingsOpen = elements.panelsContainer && 
                        elements.panelsContainer.classList.contains('show-settings');
  
  focusState.currentContext = isSettingsOpen ? 'settings' : 'timer';
  
  // Escape key: Close settings if open
  if (e.key === 'Escape' || e.keyCode === 27) {
    if (isSettingsOpen) {
      console.log('[Keyboard] Escape pressed - closing settings');
      e.preventDefault();
      e.stopPropagation();
      hideSettings();
      return;
    }
  }
  
  // Tab key: Cycle through settings tabs
  if (e.key === 'Tab' || e.keyCode === 9) {
    if (isSettingsOpen) {
      e.preventDefault();
      e.stopPropagation();
      cycleSettingsTabs(e.shiftKey); // Shift+Tab goes backwards
      return;
    }
  }
  
  // Arrow key navigation
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    
    if (focusState.currentContext === 'settings') {
      handleSettingsNavigation(e.key);
    } else {
      handleTimerNavigation(e.key);
    }
    return;
  }
  
  // Space bar activation
  if (e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32) {
    if (focusState.currentContext === 'timer') {
      e.preventDefault();
      e.stopPropagation();
      activateTimerControl();
      return;
    } else if (focusState.currentContext === 'settings') {
      e.preventDefault();
      e.stopPropagation();
      activateSettingsControl();
      return;
    }
  }
  
  // Enter key - same as space for activation
  if (e.key === 'Enter' || e.keyCode === 13) {
    if (focusState.currentContext === 'timer') {
      e.preventDefault();
      e.stopPropagation();
      activateTimerControl();
      return;
    }
  }
}

function handleTimerNavigation(key) {
  const elements = focusState.timerFocusableElements;
  if (elements.length === 0) return;
  
  // Remove focus from current element
  if (elements[focusState.timerFocusIndex]) {
    elements[focusState.timerFocusIndex].classList.remove('keyboard-focus');
  }
  
  // Navigate horizontally
  if (key === 'ArrowLeft') {
    focusState.timerFocusIndex = (focusState.timerFocusIndex - 1 + elements.length) % elements.length;
  } else if (key === 'ArrowRight') {
    focusState.timerFocusIndex = (focusState.timerFocusIndex + 1) % elements.length;
  }
  
  // Add focus to new element
  elements[focusState.timerFocusIndex].classList.add('keyboard-focus');
  console.log(`[Keyboard] Timer focus: ${focusState.timerFocusIndex} (${elements[focusState.timerFocusIndex].textContent})`);
}

function handleSettingsNavigation(key) {
  const controls = focusState.settingsFocusableElements;
  const currentTab = focusState.tabs[focusState.currentTabIndex];
  
  console.log(`[Keyboard] Settings navigation: key=${key}, tab=${currentTab}, controls=${controls.length}, focusIndex=${focusState.settingsFocusIndex}`);
  
  if (controls.length === 0) {
    console.warn('[Keyboard] No focusable controls in current tab!');
    return;
  }
  
  const currentControl = controls[focusState.settingsFocusIndex];
  
  // Vertical navigation (Up/Down)
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    // Remove focus from current control
    removeFocusFromSettingsControl(currentControl);
    
    if (key === 'ArrowUp') {
      focusState.settingsFocusIndex = (focusState.settingsFocusIndex - 1 + controls.length) % controls.length;
    } else {
      focusState.settingsFocusIndex = (focusState.settingsFocusIndex + 1) % controls.length;
    }
    
    // Add focus to new control
    const newControl = controls[focusState.settingsFocusIndex];
    addFocusToSettingsControl(newControl);
    console.log(`[Keyboard] Settings focus moved to: ${focusState.settingsFocusIndex}/${controls.length} (${newControl.name})`);
  }
  
  // Horizontal navigation (Left/Right) - adjust current control
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (currentControl.type === 'duration') {
      // Increment/decrement duration
      const delta = (key === 'ArrowRight') ? currentControl.step : -currentControl.step;
      adjustDurationValue(currentControl, delta);
    } else if (currentControl.type === 'toggle') {
      // Toggle the checkbox
      currentControl.element.checked = !currentControl.element.checked;
      autoSaveSettings();
      console.log(`[Keyboard] Toggled ${currentControl.name}: ${currentControl.element.checked}`);
    }
  }
}

function adjustDurationValue(control, delta) {
  let currentValue = parseInt(control.valueEl.textContent, 10);
  let newValue = currentValue + delta;
  
  // Clamp to min/max
  newValue = Math.max(control.min, Math.min(control.max, newValue));
  
  if (newValue !== currentValue) {
    control.valueEl.textContent = newValue.toString().padStart(2, '0');
    autoSaveSettings();
    console.log(`[Keyboard] Adjusted ${control.name}: ${currentValue} -> ${newValue}`);
  }
}

function addFocusToSettingsControl(control) {
  if (control.type === 'duration') {
    control.valueEl.classList.add('keyboard-focus');
  } else if (control.type === 'toggle') {
    control.element.classList.add('keyboard-focus');
  }
}

function removeFocusFromSettingsControl(control) {
  if (control.type === 'duration') {
    control.valueEl.classList.remove('keyboard-focus');
  } else if (control.type === 'toggle') {
    control.element.classList.remove('keyboard-focus');
  }
}

function activateTimerControl() {
  const elements = focusState.timerFocusableElements;
  if (elements.length === 0) return;
  
  const currentElement = elements[focusState.timerFocusIndex];
  console.log(`[Keyboard] Activating timer control: ${currentElement.textContent}`);
  currentElement.click();
}

function activateSettingsControl() {
  const controls = focusState.settingsFocusableElements;
  if (controls.length === 0) return;
  
  const currentControl = controls[focusState.settingsFocusIndex];
  
  if (currentControl.type === 'toggle') {
    currentControl.element.checked = !currentControl.element.checked;
    autoSaveSettings();
    console.log(`[Keyboard] Activated toggle ${currentControl.name}: ${currentControl.element.checked}`);
  }
}

function cycleSettingsTabs(reverse = false) {
  // Remove focus from current control before switching tabs
  const controls = focusState.settingsFocusableElements;
  if (controls.length > 0 && controls[focusState.settingsFocusIndex]) {
    removeFocusFromSettingsControl(controls[focusState.settingsFocusIndex]);
  }
  
  // Cycle through tabs
  if (reverse) {
    // Shift+Tab: Go backwards
    focusState.currentTabIndex = (focusState.currentTabIndex - 1 + focusState.tabs.length) % focusState.tabs.length;
  } else {
    // Tab: Go forwards
    focusState.currentTabIndex = (focusState.currentTabIndex + 1) % focusState.tabs.length;
  }
  
  const newTab = focusState.tabs[focusState.currentTabIndex];
  switchTab(newTab);
  
  // Reset focus index when switching tabs
  focusState.settingsFocusIndex = 0;
  
  // Update focusable elements to only show controls for the current tab
  focusState.settingsFocusableElements = focusState.allSettingsControls.filter(
    item => item.tab === newTab
  );
  
  console.log(`[Keyboard] ${reverse ? 'Shift+' : ''}Tab pressed - switched to ${newTab} tab (${focusState.settingsFocusableElements.length} controls)`);
  
  // Add focus to first control in new tab
  const newControls = focusState.settingsFocusableElements;
  if (newControls.length > 0 && newControls[0]) {
    addFocusToSettingsControl(newControls[0]);
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

