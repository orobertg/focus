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
  completedPomodoros: 0, // 0-4, tracks green dots (only incremented after break completes)
  pomodorosCycleCount: 0, // Total in current cycle
  currentPomodoroInBreak: -1, // Which pomodoro (0-3) is currently in break phase (for yellow dot)
  
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
  console.log('========================================');
  console.log('[Timer] 🔵 START/PAUSE BUTTON CLICKED');
  console.log('[Timer] Current runState:', state.runState);
  console.log('[Timer] Current phase:', state.phase);
  console.log('========================================');
  
  if (state.runState === 'idle' || state.runState === 'paused') {
    console.log('[Timer] Calling startTimer()...');
    startTimer();
  } else if (state.runState === 'running') {
    console.log('[Timer] Calling pauseTimer()...');
    pauseTimer();
  }
  
  sendStateUpdate(); // Notify toolbar
}

function startTimer() {
  console.log('========================================');
  console.log('[Timer] 🟢 START_TIMER() FUNCTION CALLED');
  console.log('[Timer] Phase:', state.phase, '| RunState:', state.runState);
  console.log('========================================');
  
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
    
    // If starting from idle, check phase
    if (state.runState === 'idle') {
      if (state.phase === 'break') {
        // Starting a break manually - set yellow dot NOW
        state.currentPomodoroInBreak = state.completedPomodoros;
        console.log(`[Timer] Starting break manually - yellow dot for pomodoro index: ${state.currentPomodoroInBreak}`);
        
        const isLongBreak = (state.pomodorosCycleCount % state.config.cycleLength === 0);
        const breakMinutes = isLongBreak ? state.config.longBreakMinutes : state.config.shortBreakMinutes;
        console.log('[Timer] Starting break session manually:', breakMinutes, 'minutes');
        const snapshotJson = rustCore.startBreak(breakMinutes, isLongBreak);
        snapshot = JSON.parse(snapshotJson);
        console.log('[Timer] Started break session:', snapshot);
      } else {
        // Starting a focus/work session
      const snapshotJson = rustCore.startWork();
      snapshot = JSON.parse(snapshotJson);
      console.log('[Timer] Started work session:', snapshot);
      }
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
    
    // Note: Break state is now handled by onPhaseComplete() 
    // Old pause/warm-up/cooldown logic removed for simplicity
    
    // Start ticker
    if (timerInterval) {
      console.log('[Timer] Clearing existing interval:', timerInterval);
      clearInterval(timerInterval);
    }
    
    console.log('[Timer] About to start interval...');
    timerInterval = setInterval(tick, 250); // 4 ticks per second
    console.log('[Timer] ✅ INTERVAL STARTED! intervalID:', timerInterval);
    console.log('[Timer] Current state:', {
      phase: state.phase,
      runState: state.runState,
      millisRemaining: state.millisRemaining,
      millisTotal: state.millisTotal
    });
    
    // Manually call tick once to verify it works
    console.log('[Timer] Calling tick() manually for verification...');
    tick();
    console.log('[Timer] Manual tick() complete');
    
    updateUI();
  } catch (error) {
    console.error('[Timer] Error starting timer:', error);
  }
}

function pauseTimer() {
  console.log('========================================');
  console.log('[Timer] ⏸️  PAUSE BUTTON CLICKED');
  console.log('[Timer] Current runState:', state.runState);
  console.log('========================================');
  
  try {
    const snapshotJson = rustCore.pauseTimer();
    const snapshot = JSON.parse(snapshotJson);
    console.log('[Timer] Rust core returned snapshot:', snapshot);
    
    updateStateFromSnapshot(snapshot);
    console.log('[Timer] After updateStateFromSnapshot, state.runState:', state.runState);
  } catch (error) {
    console.error('[Timer] Error pausing timer:', error);
  }
  
  state.pauseStartTime = Date.now();
  state.pauseDuration = 0;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    console.log('[Timer] Timer interval cleared');
  }
  
  // Start monitoring pause duration
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  pauseBlinkInterval = setInterval(updatePauseDuration, 250);
  
  console.log('[Timer] Calling updateUI()...');
  updateUI();
  console.log('[Timer] After updateUI(), button text should be:', elements.startPauseBtn.textContent);
  console.log('========================================');
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
  
  // Reset state (clean up old references)
  state.runState = 'idle';
  state.phase = 'focus';
  state.completedPomodoros = 0;
  state.pomodorosCycleCount = 0;
  state.currentPomodoroInBreak = -1;
  state.isInBreakState = false;
  state.inReflectionPeriod = false;
  state.reflectionStartTime = null;
  state.millisRemaining = state.config.workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  
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
  if (state.runState !== 'running') {
    console.log('[Timer] tick() called but runState is not running:', state.runState);
    return;
  }
  
  try {
    // Get latest snapshot from Rust core
    const snapshotJson = rustCore.getSnapshot();
    const snapshot = JSON.parse(snapshotJson);
    
    // Debug: Log every 10 seconds
    const secondsRemaining = Math.floor((snapshot.millisTotal - snapshot.millisElapsed) / 1000);
    if (secondsRemaining % 10 === 0 && secondsRemaining > 0) {
      console.log(`[Timer] Ticking... ${secondsRemaining}s remaining (phase: ${snapshot.phase})`);
    }
    
    updateStateFromSnapshot(snapshot);
    
    // Check if phase is complete (only trigger once by clearing interval first)
    if (state.millisRemaining <= 0) {
      console.log('========================================');
      console.log('[Timer] ⚠️ PHASE COMPLETE DETECTED!');
      console.log('[Timer] Phase:', state.phase);
      console.log('[Timer] millisRemaining:', state.millisRemaining);
      console.log('[Timer] millisElapsed:', snapshot.millisElapsed);
      console.log('[Timer] millisTotal:', snapshot.millisTotal);
      console.log('[Timer] Auto-start breaks:', state.config.autoStartBreaks);
      console.log('[Timer] Auto-start pomodoros:', state.config.autoStartPomodoros);
      console.log('========================================');
      
      // Stop ticking immediately to prevent multiple calls to onPhaseComplete
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('[Timer] Interval cleared');
      }
      
      // Handle phase completion (this will start new interval if auto-start is enabled)
      onPhaseComplete();
      return; // Exit tick immediately after phase completion
    }
  } catch (error) {
    console.error('[Timer] Error in tick:', error);
  }
  
  updateUI();
}

function onPhaseComplete() {
  console.log('========================================');
  console.log('[Timer] 🔔 onPhaseComplete() CALLED');
  console.log('[Timer] Phase:', state.phase, 'RunState:', state.runState);
  console.log('[Timer] Config:', { autoStartBreaks: state.config.autoStartBreaks, autoStartPomodoros: state.config.autoStartPomodoros });
  console.log('========================================');
  
  try {
    if (state.phase === 'work') {
      // Pomodoro completed - now enter break phase
    state.pomodorosCycleCount++;
      console.log(`[Timer] Pomodoro ${state.pomodorosCycleCount} completed. Transitioning to break.`);
      
      // Determine break duration (short or long)
      const isLongBreak = (state.pomodorosCycleCount % state.config.cycleLength === 0);
      const breakMinutes = isLongBreak ? state.config.longBreakMinutes : state.config.shortBreakMinutes;
      
      console.log(`[Timer] ${isLongBreak ? 'Long' : 'Short'} break (${breakMinutes} minutes)`);
      
      // Set up break timer
      state.phase = 'break';
      state.isInBreakState = true;
      
      // Check auto-start breaks setting
      if (state.config.autoStartBreaks) {
        console.log('[Timer] Auto-start breaks enabled - starting break automatically in Rust core');
        
        // Set yellow dot WHEN break starts
        state.currentPomodoroInBreak = state.completedPomodoros;
        console.log(`[Timer] Yellow dot will be for pomodoro index: ${state.currentPomodoroInBreak}`);
        
        // Start break session in Rust core
        const snapshotJson = rustCore.startBreak(breakMinutes, isLongBreak);
        const snapshot = JSON.parse(snapshotJson);
        console.log('[Timer] Break snapshot from Rust core:', snapshot);
        updateStateFromSnapshot(snapshot);
        
        state.runState = 'running';
        console.log('[Timer] Starting break interval...');
        // Start the timer interval
        timerInterval = setInterval(tick, 250); // 4 ticks per second
        console.log('[Timer] Break interval started. State:', { phase: state.phase, runState: state.runState, millisRemaining: state.millisRemaining });
      } else {
        console.log('[Timer] Auto-start breaks disabled - waiting for user to click START');
        // Do NOT set currentPomodoroInBreak yet - wait for user to click START
        state.currentPomodoroInBreak = -1;
        state.runState = 'idle';
        state.millisRemaining = breakMinutes * 60 * 1000;
        state.millisTotal = state.millisRemaining;
        console.log('[Timer] Break ready. Yellow dot will appear when user clicks START.');
  }
  
  updateUI();
      sendStateUpdate(); // Notify toolbar
    } else if (state.phase === 'shortbreak' || state.phase === 'longbreak') {
      // Break completed - mark pomodoro as fully complete (green dot)
      console.log(`[Timer] Break completed for pomodoro ${state.currentPomodoroInBreak + 1}`);
      
      // Increment completed pomodoros (this turns the dot green)
      state.completedPomodoros++;
      state.currentPomodoroInBreak = -1; // Clear yellow dot state
      
      console.log(`[Timer] Completed pomodoros: ${state.completedPomodoros}/4`);
      
      // Update break state
      state.isInBreakState = false;
      
      // Check if we've completed 4 full cycles (pomodoro + break)
      if (state.completedPomodoros >= 4) {
        console.log('[Timer] 4 full cycles completed! Entering REFLECT period');
        state.inReflectionPeriod = true;
        state.reflectionStartTime = Date.now();
        state.phase = 'reflect';
        state.completedPomodoros = 4; // Keep at 4 to show all green dots
        state.runState = 'idle';
        state.millisRemaining = state.reflectionMinMinutes * 60 * 1000;
        state.millisTotal = state.millisRemaining;
      } else {
        // Transition to next pomodoro
        state.phase = 'focus';
        
        // Check auto-start pomodoros setting
        if (state.config.autoStartPomodoros) {
          console.log('[Timer] Auto-start pomodoros enabled - starting next pomodoro automatically in Rust core');
          // Start work session in Rust core
          const snapshotJson = rustCore.startWork();
          const snapshot = JSON.parse(snapshotJson);
          console.log('[Timer] Next pomodoro snapshot from Rust core:', snapshot);
          updateStateFromSnapshot(snapshot);
          
          state.runState = 'running';
          console.log('[Timer] Starting next pomodoro interval...');
          // Start the timer interval
          timerInterval = setInterval(tick, 250); // 4 ticks per second
          console.log('[Timer] Pomodoro interval started. State:', { phase: state.phase, runState: state.runState, millisRemaining: state.millisRemaining });
        } else {
          console.log('[Timer] Auto-start pomodoros disabled - waiting for user to click START');
          state.runState = 'idle';
          state.millisRemaining = state.config.workMinutes * 60 * 1000;
          state.millisTotal = state.millisRemaining;
        }
      }
      
      updateUI();
      sendStateUpdate(); // Notify toolbar
    }
  } catch (error) {
    console.error('========================================');
    console.error('[Timer] ❌ ERROR IN onPhaseComplete():');
    console.error(error);
    console.error('Stack trace:', error.stack);
    console.error('========================================');
  }
}

/* ============================================
   Note: Old pause/warm-up/cooldown logic removed
   Breaks now transition directly from pomodoro completion
   ============================================ */

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
  
  // New dot logic:
  // - Gray (unlit) = Not started
  // - Yellow (solid, no blink) = Break in progress for this cycle
  // - Green (solid) = Fully completed (pomodoro + break done)
  // 
  // The yellow dot indicates the current pomodoro is in its break phase.
  // Once the break completes, it turns green to show the full cycle is done.
  
  dots.forEach((dot, index) => {
    dot.className = 'dot'; // Reset classes
    
    // Show green for fully completed cycles (pomodoro + break)
    if (index < state.completedPomodoros) {
      dot.classList.add('lit-green');
    }
    // Show yellow for the current cycle in break phase
    else if (state.isInBreakState && index === state.currentPomodoroInBreak) {
        dot.classList.add('lit-yellow');
      // No blink - solid yellow during break
    }
    // Check reflection period (force all 4 to green)
    else if (state.inReflectionPeriod && index < 4) {
        dot.classList.add('lit-green');
      }
    // Otherwise, dot stays gray (unlit)
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
  console.log('[UI] updateStartPauseButton called - runState:', state.runState);
  if (state.runState === 'running') {
    elements.startPauseBtn.textContent = 'PAUSE';
    console.log('[UI] Button set to: PAUSE');
  } else {
    elements.startPauseBtn.textContent = 'START';
    console.log('[UI] Button set to: START (runState is "' + state.runState + '")');
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
  
  // Configure Rust core with preset values
  rustCore.configure(
    state.config.workMinutes,
    state.config.shortBreakMinutes,
    state.config.longBreakMinutes,
    state.config.cycleLength
  );
  console.log('[Preset] ✓ Configured Rust core with preset values');
  
  // Update timer
  state.millisRemaining = workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  
  // Update UI
  updateUI();
  
  // Check if settings panel is open and update the UI elements
  const isSettingsOpen = elements.panelsContainer && 
                         elements.panelsContainer.classList.contains('show-settings');
  
  if (isSettingsOpen) {
    console.log('[Preset] Settings panel is open - updating slider values');
    updateSliderValues();
  }
  
  // Save to localStorage and notify main process
  saveSettingsQuiet();
  
  console.log(`[Preset] Applied and saved: ${workMinutes} min work, ${breakMinutes} min break`);
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
  // Apply visual focus immediately so user knows which button is selected
  focusState.timerFocusIndex = 1;
  if (focusState.timerFocusableElements[1]) {
    focusState.timerFocusableElements[1].classList.add('keyboard-focus');
    console.log('[Settings] Panel closed - timer focus reset to START button with visual indicator');
  }
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
  console.log('[Settings] Updating slider values from state.config:', state.config);
  elements.workMinutesValue.textContent = state.config.workMinutes.toString().padStart(2, '0');
  elements.shortBreakMinutesValue.textContent = state.config.shortBreakMinutes.toString().padStart(2, '0');
  elements.longBreakMinutesValue.textContent = state.config.longBreakMinutes;
  elements.cycleLengthValue.textContent = state.config.cycleLength;
  console.log('[Settings] Slider values updated - Work:', elements.workMinutesValue.textContent, 
              'Short Break:', elements.shortBreakMinutesValue.textContent,
              'Long Break:', elements.longBreakMinutesValue.textContent,
              'Cycle:', elements.cycleLengthValue.textContent);
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
  console.log('[Settings] ========== SAVING SETTINGS ==========');
  
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
  
  console.log('[Settings] New configuration to save:', newConfig);
  console.log('[Settings] Timer state:', { runState: state.runState, millisRemaining: state.millisRemaining });
  
  // Update state
  state.config = newConfig;
  
  // Configure Rust core with new settings
  rustCore.configure(
    newConfig.workMinutes,
    newConfig.shortBreakMinutes,
    newConfig.longBreakMinutes,
    newConfig.cycleLength
  );
  console.log('[Settings] ✓ Configured Rust core with new settings');
  
  // Always update timer display if idle (not running or in break)
  // This ensures the timer reflects the new duration immediately
  if (state.runState === 'idle') {
    const oldMillis = state.millisRemaining;
    state.millisRemaining = newConfig.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
    console.log('[Settings] ✓ Timer was IDLE - Updated timer:', oldMillis, '→', state.millisRemaining, '(', newConfig.workMinutes, 'minutes)');
  } else {
    console.log('[Settings] ⚠ Timer is NOT idle (runState:', state.runState, ') - duration will apply on next reset');
  }
  
  // Save to localStorage
  localStorage.setItem('focus-config', JSON.stringify(newConfig));
  console.log('[Settings] Saved to localStorage');
  
  // Send to main process for immediate window update
  ipcRenderer.send('settings-save', newConfig);
}

function loadSettings() {
  const saved = localStorage.getItem('focus-config');
  console.log('[Settings] ========== LOADING SETTINGS ==========');
  console.log('[Settings] Raw localStorage value:', saved);
  console.log('[Settings] Current state.millisRemaining BEFORE load:', state.millisRemaining);
  
  if (saved) {
    try {
      const config = JSON.parse(saved);
      console.log('[Settings] ✓ Parsed config from localStorage:', config);
      
      state.config = {
        workMinutes: (config.workMinutes !== undefined && config.workMinutes !== null) ? config.workMinutes : 25,
        shortBreakMinutes: (config.shortBreakMinutes !== undefined && config.shortBreakMinutes !== null) ? config.shortBreakMinutes : 5,
        longBreakMinutes: (config.longBreakMinutes !== undefined && config.longBreakMinutes !== null) ? config.longBreakMinutes : 15,
        cycleLength: (config.cycleLength !== undefined && config.cycleLength !== null) ? config.cycleLength : 4,
        soundEnabled: config.soundEnabled !== undefined ? config.soundEnabled : true,
        autoStartBreaks: config.autoStartBreaks !== undefined ? config.autoStartBreaks : true,
        autoStartPomodoros: config.autoStartPomodoros !== undefined ? config.autoStartPomodoros : false,
        showNotifications: config.showNotifications !== undefined ? config.showNotifications : true,
        alwaysOnTop: config.alwaysOnTop !== undefined ? config.alwaysOnTop : false,
      };
      console.log('[Settings] ✓ Applied configuration to state.config:', state.config);
      
      // Configure Rust core with loaded settings
      rustCore.configure(
        state.config.workMinutes,
        state.config.shortBreakMinutes,
        state.config.longBreakMinutes,
        state.config.cycleLength
      );
      console.log('[Settings] ✓ Configured Rust core with user settings');
      
      // Apply loaded settings to timer - always update on startup
      const oldMillis = state.millisRemaining;
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
      console.log('[Settings] ✓ Updated timer: ', oldMillis, '→', state.millisRemaining, '(', state.config.workMinutes, 'minutes )');
      updateTimerDisplay();
      updateProgressRing();
      console.log('[Settings] ✓ Updated display with new duration');
      
      // Send to main process on startup
      ipcRenderer.send('settings-save', state.config);
    } catch (e) {
      console.error('[Settings] Failed to load from localStorage:', e);
      // Fall back to defaults and configure Rust core
      rustCore.configure(
        state.config.workMinutes,
        state.config.shortBreakMinutes,
        state.config.longBreakMinutes,
        state.config.cycleLength
      );
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
      updateTimerDisplay();
      updateProgressRing();
      console.log('[Settings] Using defaults after parse error');
    }
  } else {
    // No saved settings, set initial timer with defaults
    console.log('[Settings] No saved settings found, using defaults:', state.config);
    rustCore.configure(
      state.config.workMinutes,
      state.config.shortBreakMinutes,
      state.config.longBreakMinutes,
      state.config.cycleLength
    );
    console.log('[Settings] ✓ Configured Rust core with default settings');
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
  
  // Tab key: Cycle through settings tabs ONLY (never exit to timer)
  if (e.key === 'Tab' || e.keyCode === 9) {
    if (isSettingsOpen) {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[Keyboard] Tab key pressed in settings - cycling tabs (Shift=${e.shiftKey}), current tab: ${focusState.tabs[focusState.currentTabIndex]}`);
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
  
  console.log(`[Keyboard] Adjusting ${control.name}: current=${currentValue}, delta=${delta}, new=${newValue}, min=${control.min}, max=${control.max}`);
  
  if (newValue !== currentValue) {
    control.valueEl.textContent = newValue.toString().padStart(2, '0');
    console.log(`[Keyboard] Updated display element textContent to: ${control.valueEl.textContent}`);
    autoSaveSettings();
    console.log(`[Keyboard] Called autoSaveSettings() for ${control.name}: ${currentValue} -> ${newValue}`);
  } else {
    console.log(`[Keyboard] No change needed for ${control.name} (already at ${currentValue})`);
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

