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
  
  // Pomodoro Queue (circular display around ring)
  pomodoroQueue: [], // Array of {type: '25' or '50', workMin: 25 or 50, breakMin: 5 or 10}
  currentPomodoroIndex: 0, // Which one in the queue is currently active
  
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
  tabNotifications: document.getElementById('tab-notifications'),
  contentDuration: document.getElementById('content-duration'),
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
  
  // Initialize preset indicator
  updateTimerPresetIndicator(state.config.workMinutes, state.config.shortBreakMinutes);
  
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
  elements.tabNotifications.addEventListener('click', () => switchTab('notifications'));
  
  // Set up slider listeners for real-time updates
  setupSliderListeners();
  
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
  
  // Clear queue (removes queued items, keeps current if exists)
  if (state.pomodoroQueue.length > 1) {
    // Remove all except current
    state.pomodoroQueue = state.pomodoroQueue.slice(0, state.currentPomodoroIndex + 1);
    console.log('[Timer] Cleared queued items, kept current');
  }
  
  updateUI();
  updatePomodoroQueue();
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
    
    // Advance to next pomodoro in queue
    const nextPomodoro = advanceQueue();
    if (nextPomodoro) {
      console.log('[Timer] Advancing to next pomodoro in queue:', nextPomodoro);
      // Update config for next pomodoro
      state.config.workMinutes = nextPomodoro.workMin;
      state.config.shortBreakMinutes = nextPomodoro.breakMin;
      rustCore.setConfig(
        nextPomodoro.workMin,
        nextPomodoro.breakMin,
        state.config.longBreakMinutes,
        state.config.cycleLength
      );
    }
    
    // Check if we've completed 4 pomodoros
    if (state.completedPomodoros >= 4) {
      console.log('[Timer] 4 pomodoros completed! Entering REFLECT period');
      state.inReflectionPeriod = true;
      state.reflectionStartTime = Date.now();
      state.phase = 'reflect';
      state.completedPomodoros = 4; // Keep at 4 to show all green dots
      // Clear queue for new cycle after reflection
      state.pomodoroQueue = [];
      state.currentPomodoroIndex = 0;
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
  updatePomodoroQueue();
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
  console.log('[Timer] Starting cool-down sequence');
  
  // Clear any existing cool-down interval
  if (state.cooldownIntervalId) {
    clearInterval(state.cooldownIntervalId);
  }
  
  // Set up interval to clear dots every 15 seconds (right to left)
  state.cooldownIntervalId = setInterval(() => {
    if (!state.isInCooldown) {
      stopCoolDown();
      return;
    }
    
    const elapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
    const newProgress = Math.min(Math.floor(elapsed / 15), 4);
    
    if (newProgress !== state.cooldownProgress) {
      state.cooldownProgress = newProgress;
      console.log(`[Timer] Cool-down progress: ${newProgress}/4 dots cleared`);
      
      // After 60 seconds, end cool-down
      if (newProgress >= 4) {
        console.log('[Timer] Cool-down complete');
        stopCoolDown();
      }
      
      updateUI();
    }
  }, 250); // Check 4 times per second
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
    
    // First, show colored dots for completed pomodoros based on type
    const isCompletedPomodoro = index < state.completedPomodoros;
    if (isCompletedPomodoro) {
      // Get the type of this completed pomodoro from the queue
      if (state.pomodoroQueue[index]) {
        const type = state.pomodoroQueue[index].type;
        if (type === '25') {
          dot.classList.add('lit-red'); // Red for 25/5
        } else if (type === '50') {
          dot.classList.add('lit-orange'); // Orange for 50/10
        } else {
          dot.classList.add('lit-green'); // Default green
        }
      } else {
        dot.classList.add('lit-green'); // Default green if no queue data
      }
    }
    
    // Then overlay special states on top
    
    // Check cool-down state (clearing yellow from right to left)
    if (state.isInCooldown && state.cooldownProgress > 0) {
      // Yellow dots remain on the LEFT side (haven't been cleared yet)
      // Cool-down clears from right to left
      const remainingYellowDots = 4 - state.cooldownProgress;
      if (index < remainingYellowDots) {
        // Override with yellow (this dot hasn't cleared yet)
        dot.classList.remove('lit-green', 'lit-red', 'lit-orange');
        dot.classList.add('lit-yellow');
      }
      // Else: keep the colored dot if it was a completed pomodoro
    }
    // Check warm-up state (filling yellow from left to right)
    else if (state.runState === 'paused' && !state.isInBreakState && state.pauseWarmUpProgress > 0) {
      // Yellow dots fill from left to right
      if (index < state.pauseWarmUpProgress) {
        // Override with yellow (warm-up in progress)
        dot.classList.remove('lit-green', 'lit-red', 'lit-orange');
        dot.classList.add('lit-yellow');
      }
      // Else: keep the colored dot if it was a completed pomodoro
    }
    // Check break state (all 4 yellow blinking, overrides everything)
    else if (state.isInBreakState) {
      dot.classList.remove('lit-green', 'lit-red', 'lit-orange');
      dot.classList.add('lit-yellow');
      dot.classList.add('blink');
    }
    // Check reflection period (force all 4 to their original colors)
    else if (state.inReflectionPeriod) {
      // Show all 4 colored dots during reflection
      if (index < 4 && !dot.classList.contains('lit-red') && !dot.classList.contains('lit-orange')) {
        dot.classList.remove('lit-yellow');
        // Re-apply the colored dot based on queue
        if (state.pomodoroQueue[index]) {
          const type = state.pomodoroQueue[index].type;
          if (type === '25') {
            dot.classList.add('lit-red');
          } else if (type === '50') {
            dot.classList.add('lit-orange');
          } else {
            dot.classList.add('lit-green');
          }
        } else {
          dot.classList.add('lit-green');
        }
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
   Pomodoro Queue (Circular Display)
   ============================================ */

function updatePomodoroQueue() {
  console.log('[Queue] Updating display, queue:', state.pomodoroQueue, 'currentIndex:', state.currentPomodoroIndex);
  
  // Get queue icon elements
  const activeIcon = document.getElementById('queue-icon-active');
  const nextIcon = document.getElementById('queue-icon-next');
  const thirdIcon = document.getElementById('queue-icon-third');
  const completedIcon = document.getElementById('queue-icon-completed');
  
  if (!activeIcon || !nextIcon || !thirdIcon || !completedIcon) return;
  
  // Clear all icons
  activeIcon.innerHTML = '';
  nextIcon.innerHTML = '';
  thirdIcon.innerHTML = '';
  completedIcon.innerHTML = '';
  
  // Remove data attributes
  activeIcon.removeAttribute('data-type');
  nextIcon.removeAttribute('data-type');
  thirdIcon.removeAttribute('data-type');
  completedIcon.removeAttribute('data-type');
  
  // Populate icons based on queue
  const queue = state.pomodoroQueue;
  const currentIdx = state.currentPomodoroIndex;
  
  // Active (current pomodoro)
  if (queue[currentIdx]) {
    renderQueueIcon(activeIcon, queue[currentIdx]);
  }
  
  // Next in line
  if (queue[currentIdx + 1]) {
    renderQueueIcon(nextIcon, queue[currentIdx + 1]);
  }
  
  // Third in queue
  if (queue[currentIdx + 2]) {
    renderQueueIcon(thirdIcon, queue[currentIdx + 2]);
  }
  
  // Completed (previous pomodoro)
  if (currentIdx > 0 && queue[currentIdx - 1]) {
    renderQueueIcon(completedIcon, queue[currentIdx - 1]);
  }
}

function renderQueueIcon(iconElement, pomodoroData) {
  const type = pomodoroData.type; // '25' or '50'
  iconElement.setAttribute('data-type', type);
  
  // Create bars representing the pomodoro type
  const barsContainer = document.createElement('div');
  barsContainer.className = 'queue-icon-bars';
  
  const focusBar = document.createElement('div');
  focusBar.className = 'queue-icon-bar queue-icon-bar-focus';
  
  const breakBar = document.createElement('div');
  breakBar.className = 'queue-icon-bar queue-icon-bar-break';
  
  barsContainer.appendChild(focusBar);
  barsContainer.appendChild(breakBar);
  iconElement.appendChild(barsContainer);
}

function addToQueue(workMin, breakMin) {
  const type = (workMin === 25 && breakMin === 5) ? '25' : '50';
  
  // Maximum 4 pomodoros in queue
  if (state.pomodoroQueue.length >= 4) {
    console.log('[Queue] Queue is full (4 pomodoros max)');
    return false;
  }
  
  state.pomodoroQueue.push({
    type: type,
    workMin: workMin,
    breakMin: breakMin
  });
  
  console.log('[Queue] Added to queue:', type, 'Total:', state.pomodoroQueue.length);
  updatePomodoroQueue();
  return true;
}

function advanceQueue() {
  if (state.currentPomodoroIndex < state.pomodoroQueue.length - 1) {
    state.currentPomodoroIndex++;
    console.log('[Queue] Advanced to index', state.currentPomodoroIndex);
    updatePomodoroQueue();
    return state.pomodoroQueue[state.currentPomodoroIndex];
  }
  return null;
}

function clearQueue() {
  // Only clear if timer is stopped
  if (state.runState !== 'idle') {
    console.log('[Queue] Cannot clear queue while timer is active');
    return false;
  }
  
  state.pomodoroQueue = [];
  state.currentPomodoroIndex = 0;
  console.log('[Queue] Cleared');
  updatePomodoroQueue();
  return true;
}

/* ============================================
   Timer Presets
   ============================================ */

function applyPreset(workMinutes, breakMinutes) {
  console.log(`[Preset] ===== APPLYING ${workMinutes}/${breakMinutes} PRESET =====`);
  console.log(`[Preset] Current state:`, {
    runState: state.runState,
    millisRemaining: state.millisRemaining,
    millisTotal: state.millisTotal,
    currentWorkMinutes: state.config.workMinutes,
    currentBreakMinutes: state.config.shortBreakMinutes,
    queueLength: state.pomodoroQueue.length,
  });
  
  // If timer is running, add to queue instead
  if (state.runState !== 'idle') {
    console.log('[Preset] Timer is active - adding to queue');
    const added = addToQueue(workMinutes, breakMinutes);
    if (!added) {
      // Queue is full, show warning
      showPresetWarning();
    }
    return;
  }
  
  // Timer is idle - set as current preset and start queue
  console.log('[Preset] Timer is idle - setting preset and initializing queue');
  
  // Update config FIRST
  console.log(`[Preset] Updating config from ${state.config.workMinutes}/${state.config.shortBreakMinutes} to ${workMinutes}/${breakMinutes}`);
  state.config.workMinutes = workMinutes;
  state.config.shortBreakMinutes = breakMinutes;
  
  // Update Rust core stub config
  rustCore.setConfig(
    state.config.workMinutes,
    state.config.shortBreakMinutes,
    state.config.longBreakMinutes,
    state.config.cycleLength
  );
  
  console.log(`[Preset] Config updated:`, state.config);
  
  // Update settings panel display values to reflect the preset
  if (elements.workMinutesValue) {
    elements.workMinutesValue.textContent = workMinutes;
  }
  if (elements.shortBreakMinutesValue) {
    elements.shortBreakMinutesValue.textContent = breakMinutes;
  }
  
  // Save to localStorage so preset persists
  const updatedConfig = { ...state.config };
  localStorage.setItem('focus-config', JSON.stringify(updatedConfig));
  
  // Update timer state directly (bypass Rust core issues)
  console.log(`[Preset] Setting timer to ${workMinutes} minutes = ${workMinutes * 60 * 1000}ms`);
  state.millisRemaining = workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  state.phase = 'focus';
  state.runState = 'idle';
  console.log(`[Preset] Timer state updated:`, {
    millisRemaining: state.millisRemaining,
    millisTotal: state.millisTotal,
    phase: state.phase,
    runState: state.runState,
  });
  
  // Reset all pomodoro tracking
  state.completedPomodoros = 0;
  state.pomodorosCycleCount = 0;
  state.pauseWarmUpProgress = 0;
  state.isInBreakState = false;
  state.isInCooldown = false;
  state.cooldownProgress = 0;
  state.inReflectionPeriod = false;
  state.pauseStartTime = null;
  state.pauseDuration = 0;
  
  // Stop all intervals
  if (timerInterval) clearInterval(timerInterval);
  if (state.warmUpIntervalId) clearInterval(state.warmUpIntervalId);
  if (state.cooldownIntervalId) clearInterval(state.cooldownIntervalId);
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  stopBreakBlink();
  
  // Update preset indicator in timer widget
  updateTimerPresetIndicator(workMinutes, breakMinutes);
  
  // Notify toolbar to update preset buttons
  ipcRenderer.send('update-toolbar-presets', {
    workMinutes: workMinutes,
    breakMinutes: breakMinutes
  });
  
  // Initialize queue with this preset if queue is empty
  if (state.pomodoroQueue.length === 0) {
    state.pomodoroQueue = [{
      type: (workMinutes === 25 && breakMinutes === 5) ? '25' : '50',
      workMin: workMinutes,
      breakMin: breakMinutes
    }];
    state.currentPomodoroIndex = 0;
    console.log('[Preset] Initialized queue with preset');
  }
  
  // Update UI
  updateUI();
  updatePomodoroQueue();
  sendStateUpdate(); // Notify toolbar
  
  console.log(`[Preset] Applied and saved: ${workMinutes} min work, ${breakMinutes} min break`);
}

function showPresetWarning() {
  const bubble = document.querySelector('.bubble');
  if (!bubble) return;
  
  // Flash red border 3 times
  let flashCount = 0;
  const flashInterval = setInterval(() => {
    if (flashCount >= 6) { // 3 flashes = 6 toggles
      clearInterval(flashInterval);
      bubble.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      return;
    }
    
    if (flashCount % 2 === 0) {
      // Flash on
      bubble.style.boxShadow = '0 0 0 3px #ef4444, 0 8px 32px rgba(239, 68, 68, 0.5)';
    } else {
      // Flash off
      bubble.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    }
    flashCount++;
  }, 200);
  
  console.log('[Preset] Warning: Reset timer before changing preset');
}

function updateTimerPresetIndicator(workMinutes, breakMinutes) {
  const indicator = document.getElementById('timer-preset-indicator');
  if (!indicator) return;
  
  const focusBar = indicator.querySelector('.timer-preset-bar-focus');
  const breakBar = indicator.querySelector('.timer-preset-bar-break');
  
  // Check if values match a preset
  if (workMinutes === 25 && breakMinutes === 5) {
    // Show 25/5 preset indicator
    focusBar.style.width = '12px';
    breakBar.style.width = '2.5px';
    indicator.setAttribute('data-preset', '25');
    indicator.style.display = 'flex';
    console.log('[Preset] Timer indicator updated to 25/5');
  } else if (workMinutes === 50 && breakMinutes === 10) {
    // Show 50/10 preset indicator
    focusBar.style.width = '12px';
    breakBar.style.width = '5px';
    indicator.setAttribute('data-preset', '50');
    indicator.style.display = 'flex';
    console.log('[Preset] Timer indicator updated to 50/10');
  } else {
    // Hide indicator for custom values
    indicator.style.display = 'none';
    indicator.setAttribute('data-preset', 'custom');
    console.log('[Preset] Timer indicator hidden (custom values)');
  }
}

/* ============================================
   Settings Panel
   ============================================ */

function showSettings() {
  console.log('[Settings] Opening settings panel');
  
  elements.panelsContainer.classList.add('show-settings');
  
  // Switch to Duration tab by default
  switchTab('duration');
  
  // Populate settings with current values
  updateSliderValues();
  elements.soundEnabledInput.checked = state.config.soundEnabled || false;
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
  
  console.log('[Settings] Panel closed');
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
  };
  
  // Update state
  state.config = newConfig;
  
  // Update Rust core stub config
  rustCore.setConfig(
    newConfig.workMinutes,
    newConfig.shortBreakMinutes,
    newConfig.longBreakMinutes,
    newConfig.cycleLength
  );
  
  // Reset timer if idle
  if (state.runState === 'idle') {
    state.millisRemaining = newConfig.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
  }
  
  // Update preset indicator based on new values
  updateTimerPresetIndicator(newConfig.workMinutes, newConfig.shortBreakMinutes);
  
  // Notify toolbar to update preset buttons
  ipcRenderer.send('update-toolbar-presets', {
    workMinutes: newConfig.workMinutes,
    breakMinutes: newConfig.shortBreakMinutes
  });
  
  // Save to localStorage
  localStorage.setItem('focus-config', JSON.stringify(newConfig));
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
      };
      console.log('[Settings] Loaded:', state.config);
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
    }
  }
  
  // Update Rust core stub with loaded config
  rustCore.setConfig(
    state.config.workMinutes,
    state.config.shortBreakMinutes,
    state.config.longBreakMinutes,
    state.config.cycleLength
  );
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

