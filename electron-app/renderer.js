/* ============================================
   Focus - Renderer Process (Unified Card)
   ============================================ */

const { ipcRenderer } = require('electron');
const rustCore = require('./core_stub.js');

// ============================================================
// State
// ============================================================

const state = {
  phase: 'idle',
  runState: 'idle',
  millisRemaining: 25 * 60 * 1000,
  millisTotal: 25 * 60 * 1000,
  pauseStartTime: null,
  pauseDuration: 0,
  activeSession: null,
  completedPomodoros: 0,
  pomodorosCycleCount: 0,
  pomodoroHistory: [],
  pomoTaskLog: [],
  pomoCurrentColor: '#13c9b5',
  pomoCurrentTaskStart: null,
  currentPomodoroInBreak: -1,
  isInWarmUp: false,
  warmUpProgress: 0,
  isBlinking: false,
  warmUpIntervalId: null,
  isInBreakState: false,
  isInCooldown: false,
  cooldownStartTime: null,
  cooldownProgress: 0,
  cooldownIntervalId: null,
  inReflectionPeriod: false,
  reflectionStartTime: null,
  reflectionMinMinutes: 10,
  reflectionAnimationIndex: 0,
  reflectionAnimationDirection: 1,
  reflectionAnimationIntervalId: null,
  reflectionTimerIntervalId: null,
  config: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cycleLength: 4,
    soundEnabled: false,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    showNotifications: true,
    alwaysOnTop: false,
  },
};

const focusState = {
  currentContext: 'timer',
  timerFocusIndex: 0,
  settingsFocusIndex: 0,
  timerFocusableElements: [],
  settingsFocusableElements: [],
  allSettingsControls: [],
  currentTabIndex: 0,
  tabs: ['duration', 'options', 'notifications', 'stats'],
};

// Full notes state (mirrors toolbar.js)
const notesState = {
  notes: [],
  openNoteIds: new Set(),
  addFormOpen: false,
  taskModes: new Map(),
  selected: null,
  activeTaskId: null,
  activeNoteId: null,
  taskRunSince: null,
  projects: [],
  activeProjectId: null,
  pickerNoteId: null,
  undoStack: [],
  dotProgress: new Map(),
};

// Notes DOM refs (assigned in init)
let noteEls = null;

let liveTicker = null;

const PROJECT_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#13c9b5'];

// ============================================================
// DOM Elements
// ============================================================

const elements = {
  bubble: document.getElementById('timer-bubble'),
  phaseIcon: document.getElementById('phase-icon'),
  timerDisplay: document.getElementById('timer-display'),
  progressDots: document.getElementById('progress-dots'),
  phaseLabel: document.getElementById('phase-label'),
  progressCircle: document.getElementById('progress-circle'),
  startPauseBtn: document.getElementById('start-pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  stopBtn: document.getElementById('stop-btn'),
  extendBtn: document.getElementById('extend-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  tabDuration: document.getElementById('tab-duration'),
  tabOptions: document.getElementById('tab-options'),
  tabNotifications: document.getElementById('tab-notifications'),
  tabStats: document.getElementById('tab-stats'),
  contentDuration: document.getElementById('content-duration'),
  contentOptions: document.getElementById('content-options'),
  contentNotifications: document.getElementById('content-notifications'),
  contentStats: document.getElementById('content-stats'),
  statsTodayFocus: document.getElementById('stats-today-focus'),
  statsTodayPomos: document.getElementById('stats-today-pomos'),
  statsStreak: document.getElementById('stats-streak'),
  statsStreakSub: document.getElementById('stats-streak-sub'),
  statsChart: document.getElementById('stats-chart'),
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
  testSoundBtn: document.getElementById('test-sound-btn'),
  autoStartBreaksInput: document.getElementById('auto-start-breaks'),
  autoStartPomodorosInput: document.getElementById('auto-start-pomodoros'),
  showNotificationsInput: document.getElementById('show-notifications'),
  alwaysOnTopToggle: document.getElementById('always-on-top-toggle'),
  orbitDot: document.getElementById('orbit-dot'),
  trail0: document.getElementById('trail-0'),
  trail1: document.getElementById('trail-1'),
  trail2: document.getElementById('trail-2'),
  trail3: document.getElementById('trail-3'),
  mq0: document.getElementById('mq0'),
  mq1: document.getElementById('mq1'),
  mq2: document.getElementById('mq2'),
  mq3: document.getElementById('mq3'),
};

let timerInterval = null;
let pauseBlinkInterval = null;

// ============================================================
// Global Functions (available before init)
// ============================================================

window.closeSettings = function() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('is-open');
  if (typeof saveSettings === 'function') saveSettings();
};

// ============================================================
// Initialization
// ============================================================

function init() {
  console.log('[Renderer] Initializing...');

  loadSettings();

  // Timer controls
  elements.startPauseBtn.addEventListener('click', handleStartPause);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.stopBtn.addEventListener('click', handleReset);
  elements.extendBtn.addEventListener('click', handleExtend);
  elements.settingsBtn.addEventListener('click', () => showSettings());

  // Settings close button — multiple strategies for reliability
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('#close-settings-btn');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      hideSettings();
    }
  }, true);

  const settingsOverlay = document.getElementById('settings-overlay');
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'close-settings-btn' || e.target.closest('#close-settings-btn')) {
        e.preventDefault();
        e.stopPropagation();
        hideSettings();
      }
    });
  }

  const attachDirectListener = () => {
    const closeBtnEl = document.getElementById('close-settings-btn');
    if (closeBtnEl) {
      const newBtn = closeBtnEl.cloneNode(true);
      closeBtnEl.parentNode.replaceChild(newBtn, closeBtnEl);
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideSettings();
      }, true);
    }
  };
  attachDirectListener();
  setTimeout(attachDirectListener, 100);

  // Settings tabs
  elements.tabDuration.addEventListener('click', () => switchTab('duration'));
  elements.tabOptions.addEventListener('click', () => switchTab('options'));
  elements.tabNotifications.addEventListener('click', () => switchTab('notifications'));
  if (elements.tabStats) elements.tabStats.addEventListener('click', () => switchTab('stats'));

  if (elements.testSoundBtn) {
    elements.testSoundBtn.addEventListener('click', () => playNotificationSound('work-complete'));
  }

  // Notes DOM refs
  noteEls = {
    notesList: document.getElementById('notes-list'),
    noteInput: document.getElementById('note-input'),
    addNoteDot: document.getElementById('add-note-dot'),
    addNoteForm: document.getElementById('timeline-add-form'),
    projectFilterRow: document.getElementById('project-filter-row'),
    projectPicker: document.getElementById('project-picker'),
    projPickList: document.getElementById('proj-pick-list'),
    projPickInput: document.getElementById('proj-pick-input'),
  };

  // Notes event listeners
  if (noteEls.addNoteDot) {
    noteEls.addNoteDot.addEventListener('click', toggleAddForm);
  }
  if (noteEls.noteInput) {
    noteEls.noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNoteFromInput({ focusTask: true });
      } else if (e.key === 'Tab') {
        if (noteEls.noteInput.value.trim()) {
          e.preventDefault();
          createNoteFromInput({ focusTask: true });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (notesState.addFormOpen) {
          noteEls.noteInput.value = '';
          toggleAddForm();
        }
      }
    });
  }

  if (noteEls.projPickInput) {
    noteEls.projPickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = noteEls.projPickInput.value.trim();
        if (!name || !notesState.pickerNoteId) return;
        const color = PROJECT_COLORS[notesState.projects.length % PROJECT_COLORS.length];
        ipcRenderer.invoke('project-create', { name, color }).then((res) => {
          if (!res || !res.ok || !res.project) return;
          notesState.projects.push(res.project);
          assignNoteProject(notesState.pickerNoteId, res.project.id);
          closeProjectPicker();
        }).catch(() => {});
      } else if (e.key === 'Escape') {
        closeProjectPicker();
      }
    });
  }

  document.addEventListener('mousedown', (e) => {
    if (!noteEls.projectPicker || !noteEls.projectPicker.classList.contains('is-open')) return;
    if (noteEls.projectPicker.contains(e.target)) return;
    if (e.target.closest('.note-project-btn, .note-project-badge')) return;
    closeProjectPicker();
  });

  ipcRenderer.on('toolbar-notes-toggle', () => { focusNewNote(); });
  ipcRenderer.on('toolbar-notes-focus-new', () => { focusNewNote(); });

  // Notes keyboard navigation (runs when settings is not open and no input focused)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      const isSettingsOpen = document.getElementById('settings-overlay')?.classList.contains('is-open');
      if (!isSettingsOpen) { e.preventDefault(); focusNewNote(); return; }
    }
  });

  document.addEventListener('keydown', (e) => {
    const isSettingsOpen = document.getElementById('settings-overlay')?.classList.contains('is-open');
    if (isSettingsOpen) return;
    const active = document.activeElement;
    const isInInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (isInInput) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undoDelete();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':  e.preventDefault(); selectNext(); break;
      case 'ArrowUp':    e.preventDefault(); selectPrev(); break;
      case 'ArrowRight': e.preventDefault(); activateSelected(); break;
      case 'ArrowLeft':  e.preventDefault(); if (state.runState === 'running') handleStartPause(); break;
      case ' ':
        if (notesState.selected) { e.preventDefault(); editSelected(); }
        break;
    }
  });

  setupSliderListeners();
  initializeFocusManagement();

  document.addEventListener('keydown', (e) => {
    handleKeyboardNavigation(e);
  });

  // Toolbar command IPC (keyboard shortcuts via main process)
  ipcRenderer.on('toolbar-command', (event, action) => {
    console.log('[Renderer] Toolbar command:', action);
    switch (action) {
      case 'toggle-play':   handleStartPause(); break;
      case 'play-if-idle':  if (state.runState === 'idle') handleStartPause(); break;
      case 'reset':         handleReset(); break;
      case 'extend':        handleExtend(); break;
      case 'preset-25':     applyPreset(25, 5); break;
      case 'preset-50':     applyPreset(50, 10); break;
      case 'notes':         handleNotes(); break;
      case 'settings':      showSettings(); break;
    }
  });

  const winMinBtn   = document.getElementById('win-minimize-btn');
  const winCloseBtn = document.getElementById('win-close-btn');
  if (winMinBtn)   winMinBtn.addEventListener('click',   () => ipcRenderer.send('window-minimize'));
  if (winCloseBtn) winCloseBtn.addEventListener('click', () => ipcRenderer.send('window-close'));

  // Notes panel collapse toggle
  const panelDivider = document.getElementById('panel-divider');
  const appEl = document.getElementById('app');
  if (panelDivider && appEl) {
    if (localStorage.getItem('notes-expanded') === 'true') {
      appEl.classList.add('notes-expanded');
      const btn = document.getElementById('collapse-toggle');
      if (btn) btn.title = 'Show timer';
    }
    panelDivider.addEventListener('click', () => {
      const isNowExpanded = appEl.classList.toggle('notes-expanded');
      localStorage.setItem('notes-expanded', String(isNowExpanded));
      const btn = document.getElementById('collapse-toggle');
      if (btn) btn.title = isNowExpanded ? 'Show timer' : 'Expand notes';
    });
  }

  updateUI();
  loadNotes();

  console.log('[Renderer] Ready!');
}

function handleNotes() {
  focusNewNote();
}

// ============================================================
// Session Recording (SQLite via main-process IPC)
// ============================================================

function normalizePhase(corePhase) {
  if (!corePhase) return 'unknown';
  const p = String(corePhase).toLowerCase();
  if (p === 'work') return 'work';
  if (p === 'shortbreak') return 'shortbreak';
  if (p === 'longbreak') return 'longbreak';
  return p;
}

function recordSessionStart(snapshot) {
  if (!snapshot || !snapshot.sessionId) return;
  const phase = normalizePhase(snapshot.phase);
  const startedAt = Date.now();
  const plannedMs = snapshot.millisTotal || 0;
  const cycleIndex = snapshot.cycleIndex ?? state.pomodorosCycleCount ?? null;

  state.activeSession = { uuid: snapshot.sessionId, startedAt, plannedMs, phase };

  ipcRenderer.invoke('session-start', {
    sessionUuid: snapshot.sessionId,
    phase,
    startedAt,
    plannedMs,
    cycleIndex,
  }).then((res) => {
    if (!res || !res.ok) console.warn('[Sessions] session-start failed:', res && res.error);
  }).catch((err) => console.warn('[Sessions] session-start IPC error:', err));
}

function recordSessionComplete() {
  const active = state.activeSession;
  if (!active) return;
  const endedAt = Date.now();
  const actualMs = Math.min(endedAt - active.startedAt, active.plannedMs);
  state.activeSession = null;
  ipcRenderer.invoke('session-complete', { sessionUuid: active.uuid, endedAt, actualMs })
    .catch((err) => console.warn('[Sessions] session-complete IPC error:', err));
}

function recordSessionAbandon() {
  const active = state.activeSession;
  if (!active) return;
  const endedAt = Date.now();
  const actualMs = Math.max(0, Math.min(endedAt - active.startedAt, active.plannedMs));
  state.activeSession = null;
  ipcRenderer.invoke('session-abandon', { sessionUuid: active.uuid, endedAt, actualMs })
    .catch((err) => console.warn('[Sessions] session-abandon IPC error:', err));
}

// ============================================================
// Timer Logic
// ============================================================

function handleStartPause() {
  console.log('[Timer] START/PAUSE clicked — runState:', state.runState);
  if (state.runState === 'idle' || state.runState === 'paused') {
    startTimer();
  } else if (state.runState === 'running') {
    pauseTimer();
  }
}

function startTimer() {
  console.log('[Timer] startTimer() — phase:', state.phase, 'runState:', state.runState);

  if (state.inReflectionPeriod) {
    const reflectionElapsed = (Date.now() - state.reflectionStartTime) / 1000 / 60;
    if (reflectionElapsed < state.reflectionMinMinutes) {
      const remaining = Math.ceil(state.reflectionMinMinutes - reflectionElapsed);
      alert(`Reflection period in progress.\n\nPlease take a ${remaining}-minute break before starting a new cycle.`);
      return;
    } else {
      if (state.reflectionTimerIntervalId) { clearInterval(state.reflectionTimerIntervalId); state.reflectionTimerIntervalId = null; }
      if (state.reflectionAnimationIntervalId) { clearInterval(state.reflectionAnimationIntervalId); state.reflectionAnimationIntervalId = null; }
      state.inReflectionPeriod = false;
      state.reflectionStartTime = null;
      state.completedPomodoros = 0;
      state.pomodorosCycleCount = 0;
      state.pomodoroHistory = [];
      state.pomoTaskLog = [];
      state.pomoCurrentTaskStart = null;
      state.phase = 'focus';
    }
  }

  try {
    let snapshot;

    if (state.runState === 'idle') {
      if (state.phase === 'break') {
        state.currentPomodoroInBreak = state.completedPomodoros;
        const isLongBreak = (state.pomodorosCycleCount % state.config.cycleLength === 0);
        const breakMinutes = isLongBreak ? state.config.longBreakMinutes : state.config.shortBreakMinutes;
        const snapshotJson = rustCore.startBreak(breakMinutes, isLongBreak);
        snapshot = JSON.parse(snapshotJson);
        recordSessionStart(snapshot);
      } else {
        const snapshotJson = rustCore.startWork();
        snapshot = JSON.parse(snapshotJson);
        recordSessionStart(snapshot);
        state.pomoTaskLog = [];
        state.pomoCurrentColor = getActiveNoteColor();
        state.pomoCurrentTaskStart = Date.now();
      }
    } else if (state.runState === 'paused') {
      if (state.isInWarmUp || state.isBlinking) {
        if (pauseBlinkInterval) { clearInterval(pauseBlinkInterval); pauseBlinkInterval = null; }
        state.isInWarmUp = false;
        state.isBlinking = false;
        state.isInBreakState = false;
        state.isInCooldown = true;
        state.cooldownStartTime = Date.now();
        state.cooldownProgress = 0;
      }
      const snapshotJson = rustCore.resumeTimer();
      snapshot = JSON.parse(snapshotJson);
      if (!state.isInBreakState) state.pomoCurrentTaskStart = Date.now();
    }

    if (snapshot) updateStateFromSnapshot(snapshot);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 250);
    tick();
    updateUI();

    // Notify notes system that timer started
    onNotesTimerRunning();

  } catch (error) {
    console.error('[Timer] Error starting timer:', error);
  }
}

function pauseTimer() {
  console.log('[Timer] pauseTimer()');
  if (!state.isInBreakState && state.pomoCurrentTaskStart !== null) {
    const ms = Date.now() - state.pomoCurrentTaskStart;
    if (ms > 0) state.pomoTaskLog.push({ color: state.pomoCurrentColor, ms });
    state.pomoCurrentTaskStart = null;
  }
  try {
    const snapshotJson = rustCore.pauseTimer();
    const snapshot = JSON.parse(snapshotJson);
    updateStateFromSnapshot(snapshot);
  } catch (error) {
    console.error('[Timer] Error pausing timer:', error);
  }

  state.pauseStartTime = Date.now();
  state.pauseDuration = 0;

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  pauseBlinkInterval = setInterval(updatePauseDuration, 250);

  updateUI();

  // Notify notes system that timer stopped
  onNotesTimerStopped();
}

function updatePauseDuration() {
  if (!state.pauseStartTime) return;
  const pauseElapsed = Math.floor((Date.now() - state.pauseStartTime) / 1000);
  state.pauseDuration = pauseElapsed;

  if (pauseElapsed < 60) return;

  if (pauseElapsed >= 60 && pauseElapsed < 120) {
    if (!state.isInWarmUp) {
      state.isInWarmUp = true;
      state.isInBreakState = true;
      state.warmUpProgress = 0;
    }
    const warmUpElapsed = pauseElapsed - 60;
    const newProgress = Math.min(Math.floor(warmUpElapsed / 15), 3);
    if (newProgress !== state.warmUpProgress) {
      state.warmUpProgress = newProgress;
      updateUI();
    }
    return;
  }

  if (pauseElapsed >= 120) {
    if (!state.isBlinking) {
      state.isInWarmUp = false;
      state.isBlinking = true;
      state.warmUpProgress = 4;
      updateUI();
    }
  }
}

function updateCooldown() {
  if (!state.isInCooldown || !state.cooldownStartTime) return;
  const cooldownElapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
  const newProgress = Math.min(Math.floor(cooldownElapsed / 15), 4);
  if (newProgress !== state.cooldownProgress) {
    state.cooldownProgress = newProgress;
  }
  if (cooldownElapsed >= 60) {
    state.isInCooldown = false;
    state.cooldownStartTime = null;
    state.cooldownProgress = 0;
    state.warmUpProgress = 0;
  }
}

function updateReflectionAnimation() {
  state.reflectionAnimationIndex += state.reflectionAnimationDirection;
  if (state.reflectionAnimationIndex >= 3) state.reflectionAnimationDirection = -1;
  else if (state.reflectionAnimationIndex <= 0) state.reflectionAnimationDirection = 1;
  updateUI();
}

function updateReflectionTimer() {
  if (!state.inReflectionPeriod || !state.reflectionStartTime) return;
  const elapsed = (Date.now() - state.reflectionStartTime) / 1000 / 60;
  const remaining = state.reflectionMinMinutes - elapsed;
  if (remaining > 0) {
    state.millisRemaining = remaining * 60 * 1000;
    updateUI();
  } else {
    state.millisRemaining = 0;
    updateUI();
  }
}

function handleReset() {
  console.log('[Timer] Reset clicked');
  recordSessionAbandon();

  try {
    const snapshotJson = rustCore.stopTimer();
    const snapshot = JSON.parse(snapshotJson);
    updateStateFromSnapshot(snapshot);
  } catch (error) {
    console.error('[Timer] Error resetting timer:', error);
  }

  if (timerInterval) clearInterval(timerInterval);
  if (pauseBlinkInterval) clearInterval(pauseBlinkInterval);
  if (state.reflectionTimerIntervalId) clearInterval(state.reflectionTimerIntervalId);
  if (state.reflectionAnimationIntervalId) clearInterval(state.reflectionAnimationIntervalId);
  timerInterval = null;
  pauseBlinkInterval = null;
  state.reflectionTimerIntervalId = null;
  state.reflectionAnimationIntervalId = null;

  state.runState = 'idle';
  state.phase = 'focus';
  state.completedPomodoros = 0;
  state.pomodorosCycleCount = 0;
  state.pomodoroHistory = [];
  state.pomoTaskLog = [];
  state.pomoCurrentTaskStart = null;
  state.currentPomodoroInBreak = -1;
  state.isInBreakState = false;
  state.inReflectionPeriod = false;
  state.reflectionStartTime = null;
  state.millisRemaining = state.config.workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  state.pauseStartTime = null;
  state.pauseDuration = 0;
  state.isInWarmUp = false;
  state.warmUpProgress = 0;
  state.isBlinking = false;
  state.isInCooldown = false;
  state.cooldownStartTime = null;
  state.cooldownProgress = 0;

  updateUI();
  onNotesTimerStopped();
}

function handleExtend() {
  if (state.runState === 'idle') return;
  state.millisRemaining += 5 * 60 * 1000;
  state.millisTotal += 5 * 60 * 1000;
  updateUI();
}

ipcRenderer.on('settings-updated', (event, settings) => {
  state.config.workMinutes = settings.workMinutes;
  state.config.shortBreakMinutes = settings.shortBreakMinutes;
  state.config.longBreakMinutes = settings.longBreakMinutes;
  state.config.cycleLength = settings.cycleLength;
  state.config.soundEnabled = settings.soundEnabled;
  if (state.runState === 'idle') {
    state.millisRemaining = settings.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateUI();
  }
});

// ============================================================
// Rust Core Integration
// ============================================================

function updateStateFromSnapshot(snapshot) {
  state.phase = snapshot.phase.toLowerCase();
  state.runState = snapshot.runState.toLowerCase();
  state.millisTotal = snapshot.millisTotal;
  state.millisRemaining = snapshot.millisTotal - snapshot.millisElapsed;
}

// ============================================================
// Timer Tick
// ============================================================

function tick() {
  if (state.runState !== 'running') return;
  try {
    const snapshotJson = rustCore.getSnapshot();
    const snapshot = JSON.parse(snapshotJson);
    updateStateFromSnapshot(snapshot);
    if (state.isInCooldown) updateCooldown();
    if (state.millisRemaining <= 0) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      onPhaseComplete();
      return;
    }
  } catch (error) {
    console.error('[Timer] Error in tick:', error);
  }
  updateUI();
}

// ============================================================
// Desktop Notifications
// ============================================================

function showDesktopNotification(title, body, type = 'default') {
  if (!state.config.showNotifications) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => { if (p === 'granted') sendNotification(title, body, type); });
  } else if (Notification.permission === 'granted') {
    sendNotification(title, body, type);
  }
}

function sendNotification(title, body, type) {
  try {
    const n = new Notification(title, {
      body,
      icon: 'assets/icons/icon-256.png',
      tag: 'focus-timer',
      requireInteraction: false,
      silent: false,
    });
    setTimeout(() => n.close(), 5000);
  } catch (error) {
    console.error('[Notification] Failed:', error);
  }
}

// ============================================================
// Sound Notifications
// ============================================================

function playNotificationSound(type = 'default') {
  if (!state.config.soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    let frequency = 800, duration = 0.2;
    switch (type) {
      case 'work-complete':       frequency = 880; duration = 0.3; break;
      case 'break-complete':      frequency = 659; duration = 0.25; break;
      case 'long-break-complete': frequency = 698; duration = 0.4; break;
    }

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);

    if (type === 'long-break-complete') {
      setTimeout(() => {
        const o2 = audioContext.createOscillator();
        const g2 = audioContext.createGain();
        o2.connect(g2); g2.connect(audioContext.destination);
        o2.frequency.value = 880; o2.type = 'sine';
        const now2 = audioContext.currentTime;
        g2.gain.setValueAtTime(0.25, now2);
        g2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.2);
        o2.start(now2); o2.stop(now2 + 0.2);
      }, 150);
    }
  } catch (error) {
    console.error('[Sound] Failed:', error);
  }
}

// ============================================================
// Phase Completion
// ============================================================

function onPhaseComplete() {
  recordSessionComplete();

  try {
    if (state.phase === 'work') {
      playNotificationSound('work-complete');
      showDesktopNotification('🎯 Focus Session Complete!', 'Great work! Time for a break.', 'work-complete');

      // Finalize task segments for this Pomodoro
      if (state.pomoCurrentTaskStart !== null) {
        const ms = Date.now() - state.pomoCurrentTaskStart;
        if (ms > 0) state.pomoTaskLog.push({ color: state.pomoCurrentColor, ms });
        state.pomoCurrentTaskStart = null;
      }
      const totalMs = state.pomoTaskLog.reduce((s, seg) => s + seg.ms, 0);
      if (totalMs > 0) {
        const entry = [];
        for (const seg of state.pomoTaskLog) {
          const last = entry[entry.length - 1];
          if (last && last.color === seg.color) last.fraction += seg.ms / totalMs;
          else entry.push({ color: seg.color, fraction: seg.ms / totalMs });
        }
        state.pomodoroHistory.push(entry);
      } else {
        state.pomodoroHistory.push([{ color: state.pomoCurrentColor || '#e8572a', fraction: 1 }]);
      }
      state.pomoTaskLog = [];

      state.pomodorosCycleCount++;
      const isLongBreak = (state.pomodorosCycleCount % state.config.cycleLength === 0);
      const breakMinutes = isLongBreak ? state.config.longBreakMinutes : state.config.shortBreakMinutes;
      state.phase = 'break';
      state.isInBreakState = true;

      if (state.config.autoStartBreaks) {
        state.currentPomodoroInBreak = state.completedPomodoros;
        const snapshotJson = rustCore.startBreak(breakMinutes, isLongBreak);
        const snapshot = JSON.parse(snapshotJson);
        recordSessionStart(snapshot);
        updateStateFromSnapshot(snapshot);
        state.runState = 'running';
        timerInterval = setInterval(tick, 250);
      } else {
        state.currentPomodoroInBreak = -1;
        state.runState = 'idle';
        state.millisRemaining = breakMinutes * 60 * 1000;
        state.millisTotal = state.millisRemaining;
      }
      updateUI();

    } else if (state.phase === 'shortbreak' || state.phase === 'longbreak') {
      const wasLongBreak = state.phase === 'longbreak';
      playNotificationSound(wasLongBreak ? 'long-break-complete' : 'break-complete');
      if (wasLongBreak) {
        showDesktopNotification('☕ Long Break Complete!', 'Feeling refreshed? Time to focus again!', 'long-break-complete');
      } else {
        showDesktopNotification('☕ Break Complete!', 'Ready to get back to work?', 'break-complete');
      }

      state.completedPomodoros++;
      state.currentPomodoroInBreak = -1;
      state.isInBreakState = false;

      if (state.completedPomodoros >= 4) {
        showDesktopNotification('🌟 All 4 Pomodoros Complete!', 'Amazing work! Time to reflect!', 'cycle-complete');
        state.inReflectionPeriod = true;
        state.reflectionStartTime = Date.now();
        state.phase = 'reflect';
        state.completedPomodoros = 4;
        state.runState = 'idle';
        state.millisRemaining = state.reflectionMinMinutes * 60 * 1000;
        state.millisTotal = state.millisRemaining;
        state.reflectionTimerIntervalId = setInterval(updateReflectionTimer, 1000);
        state.reflectionAnimationIndex = 0;
        state.reflectionAnimationDirection = 1;
        state.reflectionAnimationIntervalId = setInterval(updateReflectionAnimation, 500);
      } else {
        state.phase = 'focus';
        if (state.config.autoStartPomodoros) {
          const snapshotJson = rustCore.startWork();
          const snapshot = JSON.parse(snapshotJson);
          recordSessionStart(snapshot);
          updateStateFromSnapshot(snapshot);
          state.runState = 'running';
          timerInterval = setInterval(tick, 250);
        } else {
          state.runState = 'idle';
          state.millisRemaining = state.config.workMinutes * 60 * 1000;
          state.millisTotal = state.millisRemaining;
        }
      }
      updateUI();
    }
  } catch (error) {
    console.error('[Timer] Error in onPhaseComplete:', error);
  }
}

// ============================================================
// UI Updates
// ============================================================

function updateUI() {
  updateTimerDisplay();
  updatePhaseIcon();
  updateProgressRing();
  updateProgressDots();
  updatePhaseLabel();
  updateStartPauseButton();
  updateBubbleClass();
  updateMinuteQuarters();
  updatePomoHistory();
}

function getActiveNoteColor() {
  if (notesState.activeNoteId) {
    const note = notesState.notes.find(n => n.id === notesState.activeNoteId);
    if (note && note.projectColor) return note.projectColor;
  }
  return '#13c9b5';
}

function updatePomoHistory() {
  const g = document.getElementById('pomo-outer-ring');
  if (!g) return;
  const R = 75, C = 2 * Math.PI * R, Q = C / 4, gap = 3;
  let html = '';
  for (let i = 0; i < 4; i++) {
    const entry = state.pomodoroHistory[i];
    if (!entry || !entry.length) continue;
    let offset = i * Q + gap / 2;
    for (const seg of entry) {
      const arcLen = seg.fraction * (Q - gap);
      html += `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${seg.color}" stroke-width="9" stroke-dasharray="0 ${offset} ${arcLen} ${C}" stroke-linecap="butt" opacity="0.88"/>`;
      offset += arcLen;
    }
  }
  g.innerHTML = html;
}

function updateMinuteQuarters() {
  const mqs = [elements.mq0, elements.mq1, elements.mq2, elements.mq3];
  if (!elements.orbitDot || mqs.some(el => !el)) return;

  const running = state.runState === 'running';
  const active  = running || state.runState === 'paused';
  const progress = state.millisTotal > 0 ? 1 - (state.millisRemaining / state.millisTotal) : 0;
  const color = state.isInBreakState ? '#14b8a6' : getActiveNoteColor();

  const R = 58;
  const C = 2 * Math.PI * R; // ≈ 364.42
  const Q = C / 4;           // ≈ 91.10
  const gap = 1.5;           // half-gap between quarter arcs

  mqs.forEach((el, i) => {
    el.setAttribute('stroke', color);
    if (!active) { el.style.opacity = '0'; return; }
    const f = Math.max(0, Math.min(1, (progress - i * 0.25) * 4));
    const startPos = i * Q + gap;
    const fillLen  = f * (Q - gap * 2);
    el.setAttribute('stroke-dasharray', `0 ${startPos} ${fillLen} ${C}`);
    el.style.opacity = running ? '1' : '0.4';
  });

  const trails = [
    { el: elements.trail3, span: Math.PI,       opacity: 0.08, width: 1   },
    { el: elements.trail2, span: Math.PI / 3,   opacity: 0.25, width: 1.5 },
    { el: elements.trail1, span: Math.PI / 10,  opacity: 0.58, width: 2.5 },
    { el: elements.trail0, span: Math.PI / 28,  opacity: 0.88, width: 3.5 },
  ];

  if (running) {
    const msElapsed = state.millisTotal - state.millisRemaining;
    const a = ((msElapsed % 60000) / 60000) * 2 * Math.PI;

    trails.forEach(({ el, span, opacity, width }) => {
      if (!el) return;
      let startAngle = a - span;
      if (startAngle < 0) startAngle += 2 * Math.PI;
      const startPos = (startAngle / (2 * Math.PI)) * C;
      const arcLen   = span * R;
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', String(width));
      el.setAttribute('stroke-dasharray', `0 ${startPos} ${arcLen} ${C}`);
      el.style.opacity = String(opacity);
    });

    elements.orbitDot.setAttribute('cx', String(90 + R * Math.cos(a)));
    elements.orbitDot.setAttribute('cy', String(90 + R * Math.sin(a)));
    elements.orbitDot.setAttribute('fill', color);
    elements.orbitDot.style.opacity = '1';
  } else {
    trails.forEach(({ el }) => { if (el) el.style.opacity = '0'; });
    elements.orbitDot.style.opacity = '0';
  }
}


function updateTimerDisplay() {
  const totalSeconds = Math.ceil(state.millisRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  elements.timerDisplay.textContent =
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updatePhaseIcon() {
  const isRunning = state.runState === 'running';
  const isBreak = state.isInBreakState;
  const isPauseBreak = state.isInWarmUp || state.isBlinking;
  const isReflection = state.inReflectionPeriod;

  let iconSVG = '';
  if (isReflection) {
    iconSVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  } else if (isPauseBreak || isBreak) {
    iconSVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
  } else if (isRunning) {
    iconSVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  } else {
    iconSVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  }
  elements.phaseIcon.innerHTML = iconSVG;
}

function updateProgressRing() {
  if (!elements.progressCircle) return;
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  let progress = 0;
  if (state.millisTotal > 0) progress = 1 - (state.millisRemaining / state.millisTotal);
  elements.progressCircle.style.strokeDashoffset = circumference * (1 - progress);

  if (state.isInBreakState) {
    elements.progressCircle.style.stroke = '#13c9b5';
  } else if (state.phase === 'focus' && state.runState === 'running') {
    elements.progressCircle.style.stroke = '#13c9b5';
  } else {
    elements.progressCircle.style.stroke = 'rgba(255, 255, 255, 0.18)';
  }
}

function updateProgressDots() {
  const dots = elements.progressDots.querySelectorAll('.dot');
  dots.forEach((dot, index) => {
    dot.className = 'dot';
    if (state.inReflectionPeriod) {
      dot.classList.add(index === state.reflectionAnimationIndex ? 'lit-blue' : 'dim');
      return;
    }
    if (state.isInCooldown) {
      if (index < state.completedPomodoros) dot.classList.add('lit-green');
      else if (index < (4 - state.cooldownProgress)) dot.classList.add('lit-yellow');
      return;
    }
    if (state.isInWarmUp) {
      if (index < state.completedPomodoros) dot.classList.add('lit-green');
      else if (index <= state.warmUpProgress) dot.classList.add('lit-yellow');
      return;
    }
    if (state.isBlinking) {
      if (index < state.completedPomodoros) dot.classList.add('lit-green');
      else dot.classList.add('lit-yellow', 'blink');
      return;
    }
    if (state.isInBreakState && index === state.currentPomodoroInBreak) {
      dot.classList.add('lit-yellow');
      return;
    }
    if (index < state.completedPomodoros) dot.classList.add('lit-green');
  });
}

function updatePhaseLabel() {
  const isPaused = state.runState === 'paused' && !state.isInBreakState && !state.isInWarmUp && !state.isBlinking;
  if (state.inReflectionPeriod) {
    elements.phaseLabel.textContent = 'REFLECT';
  } else if (state.isInWarmUp || state.isBlinking) {
    elements.phaseLabel.textContent = 'BREAK';
  } else if (isPaused) {
    elements.phaseLabel.textContent = 'PAUSE';
  } else if (state.isInBreakState) {
    elements.phaseLabel.textContent = 'BREAK';
  } else {
    elements.phaseLabel.textContent = 'FOCUS';
  }
}

function updateStartPauseButton() {
  elements.startPauseBtn.innerHTML = state.runState === 'running'
    ? `<svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><rect x="0" y="0" width="4.5" height="13" rx="1.5"/><rect x="8.5" y="0" width="4.5" height="13" rx="1.5"/></svg>`
    : `<svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="0,0 12,7 0,14"/></svg>`;
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

// ============================================================
// Timer Presets
// ============================================================

function applyPreset(workMinutes, breakMinutes) {
  if (state.runState !== 'idle') handleReset();
  state.config.workMinutes = workMinutes;
  state.config.shortBreakMinutes = breakMinutes;
  rustCore.configure(state.config.workMinutes, state.config.shortBreakMinutes, state.config.longBreakMinutes, state.config.cycleLength);
  state.millisRemaining = workMinutes * 60 * 1000;
  state.millisTotal = state.millisRemaining;
  updateUI();

  const isSettingsOpen = document.getElementById('settings-overlay')?.classList.contains('is-open');
  if (isSettingsOpen) updateSliderValues();
  saveSettingsQuiet();
}

// ============================================================
// Settings Panel
// ============================================================

function showSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.add('is-open');

  focusState.timerFocusableElements.forEach(el => { if (el) el.classList.remove('keyboard-focus'); });
  focusState.currentTabIndex = 0;
  focusState.settingsFocusIndex = 0;
  switchTab('duration');
  initializeFocusManagement();

  if (focusState.settingsFocusableElements.length > 0) {
    addFocusToSettingsControl(focusState.settingsFocusableElements[0]);
  }

  updateSliderValues();
  elements.soundEnabledInput.checked = state.config.soundEnabled || false;
  elements.alwaysOnTopToggle.checked = state.config.alwaysOnTop || false;
  elements.autoStartBreaksInput.checked = state.config.autoStartBreaks !== undefined ? state.config.autoStartBreaks : true;
  elements.autoStartPomodorosInput.checked = state.config.autoStartPomodoros || false;
  elements.showNotificationsInput.checked = state.config.showNotifications !== undefined ? state.config.showNotifications : true;
}

function hideSettings() {
  if (focusState.settingsFocusableElements.length > 0 &&
      focusState.settingsFocusableElements[focusState.settingsFocusIndex]) {
    removeFocusFromSettingsControl(focusState.settingsFocusableElements[focusState.settingsFocusIndex]);
  }

  saveSettings();

  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('is-open');

  focusState.timerFocusableElements.forEach(el => { if (el) el.classList.remove('keyboard-focus'); });
  focusState.timerFocusIndex = 1;
  if (focusState.timerFocusableElements[1]) {
    focusState.timerFocusableElements[1].classList.add('keyboard-focus');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.settings-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `content-${tabName}`);
  });
  if (tabName === 'stats') refreshStats();
}

function formatFocusDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function refreshStats() {
  ipcRenderer.invoke('stats-get').then((res) => {
    if (!res || !res.ok) return;
    renderStats(res.stats);
  }).catch((err) => console.warn('[Stats] stats-get IPC error:', err));
}

function renderStats(stats) {
  if (!stats) return;
  if (elements.statsTodayFocus) elements.statsTodayFocus.textContent = formatFocusDuration(stats.todayFocusMs);
  if (elements.statsTodayPomos) {
    const n = stats.todayPomodoros;
    elements.statsTodayPomos.textContent = `${n} pomodoro${n === 1 ? '' : 's'}`;
  }
  if (elements.statsStreak) elements.statsStreak.textContent = String(stats.streak);
  if (elements.statsStreakSub) elements.statsStreakSub.textContent = stats.streak === 1 ? 'day' : 'days';

  if (elements.statsChart && Array.isArray(stats.days)) {
    const maxMs = stats.days.reduce((m, d) => Math.max(m, d.focusMs || 0), 0);
    const todayIdx = stats.days.length - 1;
    elements.statsChart.innerHTML = stats.days.map((d, i) => {
      const heightPct = maxMs > 0 ? Math.max(2, Math.round((d.focusMs / maxMs) * 100)) : 0;
      const cls = ['stats-bar-fill'];
      if (!d.focusMs) cls.push('empty');
      else if (i === todayIdx) cls.push('today');
      return `
        <div class="stats-bar-col" title="${d.label}: ${formatFocusDuration(d.focusMs)} (${d.pomodoros} pomo)">
          <div class="stats-bar-fill-wrap">
            <div class="${cls.join(' ')}" style="height:${heightPct}%"></div>
          </div>
          <div class="stats-bar-label">${escapeHtml(d.label[0] || '')}</div>
        </div>
      `;
    }).join('');
  }
}

function setupSliderListeners() {
  const makeAdj = (valueEl, delta, min, max) => () => {
    let v = parseInt(valueEl.textContent, 10) + delta;
    v = Math.max(min, Math.min(max, v));
    valueEl.textContent = v.toString().padStart(2, '0');
    autoSaveSettings();
  };

  elements.workMinutesPrev.addEventListener('click', makeAdj(elements.workMinutesValue, -5, 5, 90));
  elements.workMinutesNext.addEventListener('click', makeAdj(elements.workMinutesValue, 5, 5, 90));
  elements.shortBreakMinutesPrev.addEventListener('click', makeAdj(elements.shortBreakMinutesValue, -1, 1, 30));
  elements.shortBreakMinutesNext.addEventListener('click', makeAdj(elements.shortBreakMinutesValue, 1, 1, 30));
  elements.longBreakMinutesPrev.addEventListener('click', makeAdj(elements.longBreakMinutesValue, -5, 5, 60));
  elements.longBreakMinutesNext.addEventListener('click', makeAdj(elements.longBreakMinutesValue, 5, 5, 60));
  elements.cycleLengthPrev.addEventListener('click', makeAdj(elements.cycleLengthValue, -1, 1, 10));
  elements.cycleLengthNext.addEventListener('click', makeAdj(elements.cycleLengthValue, 1, 1, 10));

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
  clearTimeout(autoSaveSettings.timeout);
  autoSaveSettings.timeout = setTimeout(saveSettingsQuiet, 500);
}

function saveSettings() {
  saveSettingsQuiet();
}

function saveSettingsQuiet() {
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

  state.config = newConfig;
  rustCore.configure(newConfig.workMinutes, newConfig.shortBreakMinutes, newConfig.longBreakMinutes, newConfig.cycleLength);

  if (state.runState === 'idle') {
    state.millisRemaining = newConfig.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
  }

  localStorage.setItem('focus-config', JSON.stringify(newConfig));
  ipcRenderer.send('settings-save', newConfig);
}

function loadSettings() {
  const saved = localStorage.getItem('focus-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      state.config = {
        workMinutes: config.workMinutes ?? 25,
        shortBreakMinutes: config.shortBreakMinutes ?? 5,
        longBreakMinutes: config.longBreakMinutes ?? 15,
        cycleLength: config.cycleLength ?? 4,
        soundEnabled: config.soundEnabled ?? true,
        autoStartBreaks: config.autoStartBreaks ?? true,
        autoStartPomodoros: config.autoStartPomodoros ?? false,
        showNotifications: config.showNotifications ?? true,
        alwaysOnTop: config.alwaysOnTop ?? false,
      };
      rustCore.configure(state.config.workMinutes, state.config.shortBreakMinutes, state.config.longBreakMinutes, state.config.cycleLength);
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
      updateTimerDisplay();
      updateProgressRing();
      ipcRenderer.send('settings-save', state.config);
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
      rustCore.configure(state.config.workMinutes, state.config.shortBreakMinutes, state.config.longBreakMinutes, state.config.cycleLength);
      state.millisRemaining = state.config.workMinutes * 60 * 1000;
      state.millisTotal = state.millisRemaining;
    }
  } else {
    rustCore.configure(state.config.workMinutes, state.config.shortBreakMinutes, state.config.longBreakMinutes, state.config.cycleLength);
    state.millisRemaining = state.config.workMinutes * 60 * 1000;
    state.millisTotal = state.millisRemaining;
    updateTimerDisplay();
    updateProgressRing();
  }
}

// ============================================================
// Window Collapse/Expand
// ============================================================

ipcRenderer.on('window-collapsed', (event, data) => {
  showCollapsedHandle(data.edge);
});

ipcRenderer.on('window-expanded', () => {
  hideCollapsedHandle();
});

function showCollapsedHandle(edge) {
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';

  let handle = document.getElementById('collapsed-handle');
  if (!handle) {
    handle = document.createElement('div');
    handle.id = 'collapsed-handle';
    handle.innerHTML = '<div class="handle-grip">⋮⋮⋮</div>';
    document.body.appendChild(handle);
  }
  handle.className = 'collapsed-handle collapsed-handle-' + edge;
  handle.style.display = 'flex';
}

function hideCollapsedHandle() {
  const app = document.getElementById('app');
  if (app) app.style.display = 'flex';

  const handle = document.getElementById('collapsed-handle');
  if (handle) handle.style.display = 'none';
}

document.addEventListener('dblclick', (event) => {
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') return;
  ipcRenderer.send('window-double-click');
});

// ============================================================
// Keyboard Navigation
// ============================================================

function initializeFocusManagement() {
  focusState.timerFocusableElements = [
    elements.resetBtn,
    elements.startPauseBtn,
    elements.settingsBtn,
  ].filter(el => el !== null);

  focusState.timerFocusIndex = 1;

  const allSettingsControls = [
    { type: 'duration', tab: 'duration', name: 'Work Duration',   valueEl: elements.workMinutesValue,       prevBtn: elements.workMinutesPrev,       nextBtn: elements.workMinutesNext,       min: 5,  max: 90,  step: 5 },
    { type: 'duration', tab: 'duration', name: 'Short Break',     valueEl: elements.shortBreakMinutesValue, prevBtn: elements.shortBreakMinutesPrev, nextBtn: elements.shortBreakMinutesNext, min: 1,  max: 30,  step: 1 },
    { type: 'duration', tab: 'duration', name: 'Long Break',      valueEl: elements.longBreakMinutesValue,  prevBtn: elements.longBreakMinutesPrev,  nextBtn: elements.longBreakMinutesNext,  min: 5,  max: 60,  step: 5 },
    { type: 'duration', tab: 'duration', name: 'Cycle Length',    valueEl: elements.cycleLengthValue,       prevBtn: elements.cycleLengthPrev,       nextBtn: elements.cycleLengthNext,       min: 1,  max: 10,  step: 1 },
    { type: 'toggle', tab: 'options', name: 'Sound',                  element: elements.soundEnabledInput },
    { type: 'toggle', tab: 'options', name: 'Auto-start Breaks',      element: elements.autoStartBreaksInput },
    { type: 'toggle', tab: 'options', name: 'Auto-start Pomodoros',   element: elements.autoStartPomodorosInput },
    { type: 'toggle', tab: 'options', name: 'Always on Top',          element: elements.alwaysOnTopToggle },
    { type: 'toggle', tab: 'notifications', name: 'Show Notifications', element: elements.showNotificationsInput },
  ].filter(item => item.type === 'duration' ? item.valueEl !== null : item.element !== null);

  focusState.allSettingsControls = allSettingsControls;
  focusState.settingsFocusableElements = allSettingsControls.filter(
    item => item.tab === focusState.tabs[focusState.currentTabIndex]
  );
}

function handleKeyboardNavigation(e) {
  const isSettingsOpen = document.getElementById('settings-overlay')?.classList.contains('is-open') ?? false;

  focusState.currentContext = isSettingsOpen ? 'settings' : 'timer';

  if (e.key === 'Escape' || e.keyCode === 27) {
    if (isSettingsOpen) {
      e.preventDefault();
      e.stopPropagation();
      hideSettings();
      return;
    }
  }

  if ((e.key === 'Tab' || e.keyCode === 9) && isSettingsOpen) {
    e.preventDefault();
    e.stopPropagation();
    cycleSettingsTabs(e.shiftKey);
    return;
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    // Only handle timer navigation here — notes nav is handled by separate listener
    if (focusState.currentContext === 'settings') {
      e.preventDefault();
      e.stopPropagation();
      handleSettingsNavigation(e.key);
    } else {
      // Timer navigation only when in input context
      const active = document.activeElement;
      const isInInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isInInput) {
        // Notes keydown listener handles ArrowUp/Down/Left/Right; timer nav uses Left/Right
        // We let the notes handler take precedence, no action here
      }
    }
    return;
  }

  if ((e.key === ' ' || e.keyCode === 32) && focusState.currentContext === 'settings') {
    e.preventDefault();
    e.stopPropagation();
    activateSettingsControl();
    return;
  }

  if ((e.key === 'Enter' || e.keyCode === 13) && focusState.currentContext === 'timer') {
    e.preventDefault();
    e.stopPropagation();
    activateTimerControl();
    return;
  }
}

function handleTimerNavigation(key) {
  const els = focusState.timerFocusableElements;
  if (!els.length) return;
  if (els[focusState.timerFocusIndex]) els[focusState.timerFocusIndex].classList.remove('keyboard-focus');
  if (key === 'ArrowLeft')  focusState.timerFocusIndex = (focusState.timerFocusIndex - 1 + els.length) % els.length;
  else if (key === 'ArrowRight') focusState.timerFocusIndex = (focusState.timerFocusIndex + 1) % els.length;
  els[focusState.timerFocusIndex].classList.add('keyboard-focus');
}

function handleSettingsNavigation(key) {
  const controls = focusState.settingsFocusableElements;
  if (!controls.length) return;
  const currentControl = controls[focusState.settingsFocusIndex];

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    removeFocusFromSettingsControl(currentControl);
    if (key === 'ArrowUp') focusState.settingsFocusIndex = (focusState.settingsFocusIndex - 1 + controls.length) % controls.length;
    else focusState.settingsFocusIndex = (focusState.settingsFocusIndex + 1) % controls.length;
    addFocusToSettingsControl(controls[focusState.settingsFocusIndex]);
  }

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (currentControl.type === 'duration') {
      adjustDurationValue(currentControl, key === 'ArrowRight' ? currentControl.step : -currentControl.step);
    } else if (currentControl.type === 'toggle') {
      currentControl.element.checked = !currentControl.element.checked;
      autoSaveSettings();
    }
  }
}

function adjustDurationValue(control, delta) {
  let v = parseInt(control.valueEl.textContent, 10) + delta;
  v = Math.max(control.min, Math.min(control.max, v));
  control.valueEl.textContent = v.toString().padStart(2, '0');
  autoSaveSettings();
}

function addFocusToSettingsControl(control) {
  if (control.type === 'duration') control.valueEl.classList.add('keyboard-focus');
  else if (control.type === 'toggle') control.element.classList.add('keyboard-focus');
}

function removeFocusFromSettingsControl(control) {
  if (control.type === 'duration') control.valueEl.classList.remove('keyboard-focus');
  else if (control.type === 'toggle') control.element.classList.remove('keyboard-focus');
}

function activateTimerControl() {
  const els = focusState.timerFocusableElements;
  if (!els.length) return;
  els[focusState.timerFocusIndex].click();
}

function activateSettingsControl() {
  const controls = focusState.settingsFocusableElements;
  if (!controls.length) return;
  const control = controls[focusState.settingsFocusIndex];
  if (control.type === 'toggle') {
    control.element.checked = !control.element.checked;
    autoSaveSettings();
  }
}

function cycleSettingsTabs(reverse = false) {
  const controls = focusState.settingsFocusableElements;
  if (controls.length > 0 && controls[focusState.settingsFocusIndex]) {
    removeFocusFromSettingsControl(controls[focusState.settingsFocusIndex]);
  }
  if (reverse) focusState.currentTabIndex = (focusState.currentTabIndex - 1 + focusState.tabs.length) % focusState.tabs.length;
  else focusState.currentTabIndex = (focusState.currentTabIndex + 1) % focusState.tabs.length;
  const newTab = focusState.tabs[focusState.currentTabIndex];
  switchTab(newTab);
  focusState.settingsFocusIndex = 0;
  focusState.settingsFocusableElements = focusState.allSettingsControls.filter(item => item.tab === newTab);
  if (focusState.settingsFocusableElements.length > 0) {
    addFocusToSettingsControl(focusState.settingsFocusableElements[0]);
  }
}

// ============================================================
// Utilities
// ============================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Notes: Timer Integration Hooks
// ============================================================

function onNotesTimerRunning() {
  if (notesState.activeTaskId || notesState.activeNoteId) {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
  }
}

function onNotesTimerStopped() {
  recordActiveTime();
  stopLiveTicker();
}

// ============================================================
// Notes: Live Ticker
// ============================================================

function formatTaskTime(ms) {
  if (!ms || ms < 1000) return '';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function startLiveTicker() {
  if (liveTicker) clearInterval(liveTicker);
  liveTicker = setInterval(() => {
    if (state.runState !== 'running' || !notesState.taskRunSince) { stopLiveTicker(); return; }
    const sessionMs = Date.now() - notesState.taskRunSince;
    if (notesState.activeTaskId) {
      let savedMs = 0;
      for (const note of notesState.notes) {
        const task = (note.tasks || []).find((t) => t.id === notesState.activeTaskId);
        if (task) { savedMs = task.timeMs || 0; break; }
      }
      const row = noteEls.notesList && noteEls.notesList.querySelector(`.task-row[data-task-id="${notesState.activeTaskId}"]`);
      if (row) updateTaskTimeDisplay(row, savedMs + sessionMs);
    } else if (notesState.activeNoteId) {
      const noteEl = noteEls.notesList && noteEls.notesList.querySelector(`.timeline-note[data-note-id="${notesState.activeNoteId}"]`);
      if (noteEl) {
        let savedMs = 0;
        const note = notesState.notes.find((n) => n.id === notesState.activeNoteId);
        if (note) savedMs = note.timeMs || 0;
        const timeSpan = noteEl.querySelector('.note-time');
        if (timeSpan) timeSpan.textContent = formatTaskTime(savedMs + sessionMs);
      }
    }
  }, 500);
}

function stopLiveTicker() {
  if (liveTicker) { clearInterval(liveTicker); liveTicker = null; }
}

// ============================================================
// Notes: Add Form
// ============================================================

function toggleAddForm() {
  notesState.addFormOpen = !notesState.addFormOpen;
  if (noteEls.addNoteForm) noteEls.addNoteForm.classList.toggle('is-open', notesState.addFormOpen);
  if (notesState.addFormOpen && noteEls.noteInput) setTimeout(() => noteEls.noteInput.focus(), 50);
}

// ============================================================
// Notes: Load & Render
// ============================================================

function loadNotes() {
  Promise.all([
    ipcRenderer.invoke('notes-list'),
    ipcRenderer.invoke('project-list'),
  ]).then(([notesRes, projRes]) => {
    if (notesRes && notesRes.ok) notesState.notes = Array.isArray(notesRes.notes) ? notesRes.notes : [];
    if (projRes && projRes.ok) notesState.projects = Array.isArray(projRes.projects) ? projRes.projects : [];
    renderProjectFilter();
    renderNotes();
  }).catch((err) => console.warn('[Notes] load failed:', err));
}

function renderNotes() {
  if (!noteEls || !noteEls.notesList) return;
  clearSelection();

  const visibleNotes = notesState.activeProjectId
    ? notesState.notes.filter((n) => n.projectId === notesState.activeProjectId)
    : notesState.notes;

  if (!visibleNotes.length) {
    noteEls.notesList.innerHTML = '<div class="timeline-empty">No notes yet</div>';
    return;
  }

  noteEls.notesList.innerHTML = visibleNotes.map((note) => {
    const isOpen = notesState.openNoteIds.has(note.id);
    const noteTotalMs = (note.timeMs || 0) + (note.tasks || []).reduce((s, t) => s + (t.timeMs || 0), 0);
    const isNoteTimerActive = notesState.activeNoteId === note.id;

    const tasks = (note.tasks || []).map((task) => {
      const timeLabel = formatTaskTime(task.timeMs);
      const isActive = notesState.activeTaskId === task.id;
      const editBtn = `<button class="task-edit-btn" data-task-id="${task.id}" data-note-id="${note.id}" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>`;
      const delBtn = `<button class="task-delete-btn" data-task-id="${task.id}" data-note-id="${note.id}">×</button>`;

      if (task.taskType === 'text') {
        return `
          <div class="task-row text-type" data-task-id="${task.id}" data-note-id="${note.id}">
            <span class="task-text">${escapeHtml(task.text)}</span>
            ${timeLabel ? `<span class="task-time">${timeLabel}</span>` : ''}
            ${editBtn}${delBtn}
          </div>`;
      }
      return `
        <label class="task-row ${task.done ? 'done' : ''}${isActive ? ' is-active-task' : ''}" data-task-id="${task.id}" data-note-id="${note.id}">
          <input type="checkbox" data-task-id="${task.id}" ${task.done ? 'checked' : ''} />
          <span class="task-text">${escapeHtml(task.text)}</span>
          ${timeLabel ? `<span class="task-time">${timeLabel}</span>` : ''}
          ${editBtn}${delBtn}
        </label>`;
    }).join('');

    return `
      <div class="timeline-note${isOpen ? ' is-open' : ''}" data-note-id="${note.id}">
        <div class="timeline-node">
          <div class="timeline-dot${noteTotalMs > 0 ? ' has-time' : ''}${isNoteTimerActive ? ' is-timer-active' : ''}" data-note-id="${note.id}">
          <button class="dot-start-btn" data-note-id="${note.id}" title="Start timer">
            <svg viewBox="0 0 6 8" width="6" height="8" fill="currentColor"><polygon points="0,0 6,4 0,8"/></svg>
          </button>
        </div>
        </div>
        <div class="timeline-note-card">
          <div class="timeline-note-header" data-note-id="${note.id}">
            <span class="note-title">${escapeHtml(note.title)}</span>
            ${isOpen && noteTotalMs > 0 ? `<span class="note-time">${formatTaskTime(noteTotalMs)}</span>` : ''}
            <div class="timeline-note-actions">
              <button class="note-action-btn note-edit-btn" data-note-id="${note.id}" title="Edit note title">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="note-action-btn note-delete-btn" data-note-id="${note.id}" title="Delete note">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/>
                  <line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="timeline-note-body">
            <div class="timeline-tasks">${tasks}</div>
            <div class="task-add-area">
              <div class="task-add-row">
                <div class="task-add-dot is-task"></div>
                <input type="text" data-note-input="${note.id}" data-mode="task" placeholder="Add a task…" autocomplete="off" spellcheck="false" />
              </div>
              <div class="task-add-row">
                <div class="task-add-dot is-note"></div>
                <input type="text" data-note-input="${note.id}" data-mode="text" placeholder="Add a note…" autocomplete="off" spellcheck="false" />
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Wire events
  noteEls.notesList.querySelectorAll('.timeline-dot[data-note-id]').forEach((node) => {
    node.addEventListener('click', () => toggleNote(parseInt(node.dataset.noteId, 10)));
  });
  noteEls.notesList.querySelectorAll('.dot-start-btn[data-note-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateNote(parseInt(btn.dataset.noteId, 10));
    });
  });
  noteEls.notesList.querySelectorAll('.timeline-note-header[data-note-id]').forEach((node) => {
    node.addEventListener('click', () => toggleNote(parseInt(node.dataset.noteId, 10)));
  });
  noteEls.notesList.querySelectorAll('input[type="checkbox"][data-task-id]').forEach((node) => {
    node.addEventListener('change', onTaskToggle);
  });
  noteEls.notesList.querySelectorAll('input[data-note-input]').forEach((node) => {
    node.addEventListener('keydown', onTaskInputKeydown);
  });
  noteEls.notesList.querySelectorAll('.note-delete-btn[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(parseInt(node.dataset.noteId, 10)); });
  });
  noteEls.notesList.querySelectorAll('.note-edit-btn[data-note-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      const noteId = parseInt(node.dataset.noteId, 10);
      const header = node.closest('.timeline-note-header');
      if (!header) return;
      const titleSpan = header.querySelector('.note-title');
      if (!titleSpan) return;
      startInlineEdit(header, titleSpan.textContent, (newTitle) => {
        ipcRenderer.invoke('note-update', { noteId, title: newTitle }).catch(() => {});
        const note = notesState.notes.find((n) => n.id === noteId);
        if (note) note.title = newTitle;
      });
    });
  });
  noteEls.notesList.querySelectorAll('.task-delete-btn[data-task-id]').forEach((node) => {
    node.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(parseInt(node.dataset.taskId, 10), parseInt(node.dataset.noteId, 10)); });
  });
  noteEls.notesList.querySelectorAll('.task-edit-btn[data-task-id]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      startTaskEdit(parseInt(node.dataset.taskId, 10), parseInt(node.dataset.noteId, 10));
    });
  });
}

// ============================================================
// Notes: Toggle / Undo / Edit
// ============================================================

function toggleNote(noteId) {
  if (!noteId) return;
  const el = noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!el) return;
  const isOpen = el.classList.toggle('is-open');
  if (isOpen) notesState.openNoteIds.add(noteId);
  else notesState.openNoteIds.delete(noteId);
}

function pushUndo(entry) {
  notesState.undoStack.push(entry);
  if (notesState.undoStack.length > 10) notesState.undoStack.shift();
}

function undoDelete() {
  if (!notesState.undoStack.length) return;
  const entry = notesState.undoStack.pop();

  if (entry.type === 'task') {
    const note = notesState.notes.find((n) => n.id === entry.noteId);
    if (!note) return;
    ipcRenderer.invoke('task-create', { noteId: entry.noteId, text: entry.text, taskType: entry.taskType }).then((res) => {
      if (!res || !res.ok || !res.task) return;
      note.tasks = [...(note.tasks || []), { id: res.task.id, text: entry.text, done: false, taskType: entry.taskType, timeMs: 0 }];
      addTaskToDom(res.task.id, entry.text, entry.taskType, entry.noteId);
      const noteEl = noteEls.notesList && noteEls.notesList.querySelector(`.timeline-note[data-note-id="${entry.noteId}"]`);
      if (noteEl && !noteEl.classList.contains('is-open')) toggleNote(entry.noteId);
    }).catch(() => {});
  } else if (entry.type === 'note') {
    ipcRenderer.invoke('note-create', { title: entry.title, bodyMd: entry.bodyMd || '' }).then(async (res) => {
      if (!res || !res.ok || !res.note) return;
      const noteId = res.note.id;
      for (const t of entry.tasks) {
        await ipcRenderer.invoke('task-create', { noteId, text: t.text, taskType: t.taskType }).catch(() => {});
      }
      loadNotes();
    }).catch(() => {});
  }
}

function startTaskEdit(taskId, noteId) {
  const row = noteEls.notesList && noteEls.notesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
  if (!row) return;
  const textSpan = row.querySelector('.task-text');
  if (!textSpan) return;
  startInlineEdit(row, textSpan.textContent, (newText) => {
    ipcRenderer.invoke('task-update', { taskId, text: newText }).catch(() => {});
    const note = notesState.notes.find((n) => n.id === noteId);
    const task = note && (note.tasks || []).find((t) => t.id === taskId);
    if (task) task.text = newText;
  });
}

function deleteNote(noteId) {
  if (!noteId) return;
  const note = notesState.notes.find((n) => n.id === noteId);
  if (note) pushUndo({ type: 'note', title: note.title, bodyMd: note.bodyMd || '', tasks: (note.tasks || []).map((t) => ({ text: t.text, taskType: t.taskType })) });
  ipcRenderer.invoke('note-delete', { noteId }).then((res) => {
    if (!res || !res.ok) return;
    notesState.notes = notesState.notes.filter((n) => n.id !== noteId);
    notesState.openNoteIds.delete(noteId);
    notesState.dotProgress.delete(noteId);
    const noteEl = noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
    if (noteEl) {
      noteEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      noteEl.style.opacity = '0';
      noteEl.style.transform = 'translateX(-8px)';
      setTimeout(() => {
        noteEl.remove();
        if (!notesState.notes.length) noteEls.notesList.innerHTML = '<div class="timeline-empty">No notes yet</div>';
      }, 200);
    }
  }).catch((err) => console.warn('[Notes] note-delete failed:', err));
}

function deleteTask(taskId, noteId) {
  if (!taskId || !noteId) return;
  const note = notesState.notes.find((n) => n.id === noteId);
  const task = note && (note.tasks || []).find((t) => t.id === taskId);
  if (task) pushUndo({ type: 'task', noteId, text: task.text, taskType: task.taskType });
  ipcRenderer.invoke('task-delete', { taskId }).then((res) => {
    if (!res || !res.ok) return;
    const n = notesState.notes.find((n) => n.id === noteId);
    if (n) n.tasks = (n.tasks || []).filter((t) => t.id !== taskId);
    const row = noteEls.notesList && noteEls.notesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
    if (row) {
      row.style.transition = 'opacity 0.15s ease';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 150);
    }
  }).catch((err) => console.warn('[Notes] task-delete failed:', err));
}

function focusNewNote() {
  if (!notesState.addFormOpen) {
    notesState.addFormOpen = true;
    if (noteEls.addNoteForm) noteEls.addNoteForm.classList.add('is-open');
  }
  if (noteEls.noteInput) setTimeout(() => noteEls.noteInput.focus(), 50);
}

function createNoteFromInput({ focusTask = false } = {}) {
  const input = noteEls.noteInput;
  if (!input) return;
  const title = input.value.trim();
  if (!title) return;

  ipcRenderer.invoke('note-create', { title, bodyMd: '' }).then((res) => {
    if (!res || !res.ok || !res.note) return;
    input.value = '';
    notesState.addFormOpen = false;
    if (noteEls.addNoteForm) noteEls.addNoteForm.classList.remove('is-open');
    notesState.notes = [{ ...res.note, tasks: [] }, ...notesState.notes];
    notesState.openNoteIds.add(res.note.id);
    renderNotes();
    if (focusTask) {
      const noteEl = noteEls.notesList.querySelector(`.timeline-note[data-note-id="${res.note.id}"]`);
      const taskInput = noteEl && noteEl.querySelector('.task-add-row input');
      if (taskInput) setTimeout(() => taskInput.focus(), 50);
    }
  }).catch((err) => console.warn('[Notes] note-create failed:', err));
}

function addTaskToDom(taskId, text, taskType, noteId) {
  const noteEl = noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!noteEl) return;
  const tasksContainer = noteEl.querySelector('.timeline-tasks');
  if (!tasksContainer) return;

  const editBtnHtml = `<button class="task-edit-btn" data-task-id="${taskId}" data-note-id="${noteId}" title="Edit">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>`;

  let el;
  if (taskType === 'text') {
    el = document.createElement('div');
    el.className = 'task-row text-type';
    el.dataset.taskId = taskId;
    el.dataset.noteId = noteId;
    el.innerHTML = `<span class="task-text">${escapeHtml(text)}</span>${editBtnHtml}<button class="task-delete-btn" data-task-id="${taskId}" data-note-id="${noteId}">×</button>`;
  } else {
    el = document.createElement('label');
    el.className = 'task-row';
    el.dataset.taskId = taskId;
    el.dataset.noteId = noteId;
    el.innerHTML = `<input type="checkbox" data-task-id="${taskId}" /><span class="task-text">${escapeHtml(text)}</span>${editBtnHtml}<button class="task-delete-btn" data-task-id="${taskId}" data-note-id="${noteId}">×</button>`;
    el.querySelector('input[type="checkbox"]').addEventListener('change', onTaskToggle);
  }
  el.querySelector('.task-edit-btn').addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); startTaskEdit(taskId, noteId); });
  el.querySelector('.task-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(taskId, noteId); });
  tasksContainer.appendChild(el);
}

function onTaskInputKeydown(event) {
  const input = event.target;
  const noteId = parseInt(input.dataset.noteInput, 10);
  if (!noteId) return;

  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    let text = input.value.trim();
    let taskType = input.dataset.mode || 'task';
    const finish = () => toggleNote(noteId);
    if (!text) { finish(); return; }
    ipcRenderer.invoke('task-create', { noteId, text, taskType }).then((res) => {
      if (res && res.ok && res.task) {
        const note = notesState.notes.find((n) => n.id === noteId);
        if (note) note.tasks = [...(note.tasks || []), { id: res.task.id, text, done: false, taskType }];
        input.value = '';
        addTaskToDom(res.task.id, text, taskType, noteId);
      }
      finish();
    }).catch(finish);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    let text = input.value.trim();
    if (!text) return;
    let taskType = input.dataset.mode || 'task';
    ipcRenderer.invoke('task-create', { noteId, text, taskType }).then((res) => {
      if (!res || !res.ok || !res.task) return;
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) note.tasks = [...(note.tasks || []), { id: res.task.id, text, done: false, taskType }];
      input.value = '';
      addTaskToDom(res.task.id, text, taskType, noteId);
    }).catch((err) => console.warn('[Notes] task-create failed:', err));
  }
}

function onTaskToggle(event) {
  const taskId = parseInt(event.target.dataset.taskId, 10);
  const done = !!event.target.checked;
  if (!taskId) return;
  ipcRenderer.invoke('task-toggle', { taskId, done }).then((res) => {
    if (!res || !res.ok) return;
    for (const note of notesState.notes) {
      const task = (note.tasks || []).find((t) => t.id === taskId);
      if (task) task.done = done;
    }
    const row = event.target.closest('.task-row');
    if (row) row.classList.toggle('done', done);
  }).catch((err) => console.warn('[Notes] task-toggle failed:', err));
}

// ============================================================
// Notes: Keyboard Navigation (list)
// ============================================================

function getNavigableItems() {
  const items = [];
  if (!noteEls.notesList) return items;
  noteEls.notesList.querySelectorAll('.timeline-note').forEach((noteEl) => {
    const noteId = parseInt(noteEl.dataset.noteId, 10);
    const headerEl = noteEl.querySelector('.timeline-note-header');
    if (headerEl) items.push({ el: headerEl, type: 'note', noteId });
    if (noteEl.classList.contains('is-open')) {
      noteEl.querySelectorAll('.task-row').forEach((taskEl) => {
        const taskId = parseInt(taskEl.dataset.taskId, 10);
        const isTextType = taskEl.classList.contains('text-type');
        if (taskId) items.push({ el: taskEl, type: 'task', noteId, taskId, isTextType });
      });
    }
  });
  return items;
}

function clearSelection() {
  noteEls.notesList && noteEls.notesList.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
  notesState.selected = null;
}

function selectItem(item) {
  clearSelection();
  if (!item) return;
  notesState.selected = item;
  item.el.classList.add('is-selected');
  item.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function selectNext() {
  const items = getNavigableItems();
  if (!items.length) return;
  if (!notesState.selected) { selectItem(items[0]); return; }
  const idx = items.findIndex((i) => i.type === notesState.selected.type && i.noteId === notesState.selected.noteId && i.taskId === notesState.selected.taskId);
  selectItem(items[Math.min(idx === -1 ? 0 : idx + 1, items.length - 1)]);
}

function selectPrev() {
  const items = getNavigableItems();
  if (!items.length) return;
  if (!notesState.selected) { selectItem(items[items.length - 1]); return; }
  const idx = items.findIndex((i) => i.type === notesState.selected.type && i.noteId === notesState.selected.noteId && i.taskId === notesState.selected.taskId);
  selectItem(items[Math.max(idx <= 0 ? 0 : idx - 1, 0)]);
}

// ============================================================
// Notes: Time Tracking
// ============================================================

function updateTaskTimeDisplay(row, timeMs) {
  const label = formatTaskTime(timeMs);
  const existing = row.querySelector('.task-time');
  if (label) {
    if (existing) { existing.textContent = label; return; }
    const span = document.createElement('span');
    span.className = 'task-time';
    span.textContent = label;
    const delBtn = row.querySelector('.task-delete-btn');
    if (delBtn) row.insertBefore(span, delBtn); else row.appendChild(span);
  } else if (existing) {
    existing.remove();
  }
}

function updateNoteTimeDisplay(noteId, note) {
  const noteEl = noteEls.notesList && noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
  if (!noteEl) return;
  const noteTotalMs = (note.timeMs || 0) + (note.tasks || []).reduce((s, t) => s + (t.timeMs || 0), 0);
  const dot = noteEl.querySelector('.timeline-dot');
  if (dot) dot.classList.toggle('has-time', noteTotalMs > 0);
  if (!noteEl.classList.contains('is-open')) return;
  const header = noteEl.querySelector('.timeline-note-header');
  if (!header) return;
  const label = formatTaskTime(noteTotalMs);
  const existing = header.querySelector('.note-time');
  if (label) {
    if (existing) { existing.textContent = label; return; }
    const span = document.createElement('span');
    span.className = 'note-time';
    span.textContent = label;
    const actions = header.querySelector('.timeline-note-actions');
    header.insertBefore(span, actions);
  } else if (existing) {
    existing.remove();
  }
}

function recordActiveTime() {
  if (!notesState.taskRunSince) return;
  const ms = Date.now() - notesState.taskRunSince;
  notesState.taskRunSince = null;
  if (ms < 1000) return;

  if (notesState.activeNoteId) {
    const noteId = notesState.activeNoteId;
    ipcRenderer.invoke('note-add-time', { noteId, ms }).then((res) => {
      if (!res || !res.ok) return;
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) { note.timeMs = (note.timeMs || 0) + ms; updateNoteTimeDisplay(noteId, note); }
    }).catch((err) => console.warn('[Notes] note-add-time failed:', err));
  } else if (notesState.activeTaskId) {
    const taskId = notesState.activeTaskId;
    ipcRenderer.invoke('task-add-time', { taskId, ms }).then((res) => {
      if (!res || !res.ok) return;
      for (const note of notesState.notes) {
        const task = (note.tasks || []).find((t) => t.id === taskId);
        if (task) {
          task.timeMs = (task.timeMs || 0) + ms;
          const row = noteEls.notesList && noteEls.notesList.querySelector(`.task-row[data-task-id="${taskId}"]`);
          if (row) updateTaskTimeDisplay(row, task.timeMs);
          updateNoteTimeDisplay(note.id, note);
        }
      }
    }).catch((err) => console.warn('[Notes] task-add-time failed:', err));
  }
}

function clearActiveIndicators() {
  if (notesState.activeNoteId) {
    const dot = noteEls.notesList && noteEls.notesList.querySelector(
      `.timeline-note[data-note-id="${notesState.activeNoteId}"] .timeline-dot`
    );
    if (dot) dot.classList.remove('is-timer-active');
  }
  if (notesState.activeTaskId) {
    const row = noteEls.notesList && noteEls.notesList.querySelector(`.task-row[data-task-id="${notesState.activeTaskId}"]`);
    if (row) row.classList.remove('is-active-task');
  }
}


function activateNote(noteId) {
  if (notesState.activeNoteId === noteId && state.runState === 'running') return;
  if (state.runState === 'running' && !state.isInBreakState && state.pomoCurrentTaskStart !== null) {
    const ms = Date.now() - state.pomoCurrentTaskStart;
    if (ms > 0) state.pomoTaskLog.push({ color: state.pomoCurrentColor, ms });
    state.pomoCurrentTaskStart = null;
  }
  recordActiveTime();
  clearActiveIndicators();
  notesState.activeNoteId = noteId;
  notesState.activeTaskId = null;
  const dot = noteEls.notesList && noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"] .timeline-dot`);
  if (dot) dot.classList.add('is-timer-active');
  if (state.runState === 'running') {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
    if (!state.isInBreakState) {
      state.pomoCurrentColor = getActiveNoteColor();
      state.pomoCurrentTaskStart = Date.now();
    }
  } else {
    notesState.taskRunSince = null;
    state.pomoCurrentColor = getActiveNoteColor();
    if (state.runState === 'idle') handleStartPause();
  }
}

function activateTask(taskId, taskEl) {
  if (notesState.activeTaskId === taskId && state.runState === 'running') return;
  recordActiveTime();
  clearActiveIndicators();
  notesState.activeTaskId = taskId;
  notesState.activeNoteId = null;
  if (taskEl) taskEl.classList.add('is-active-task');
  if (state.runState === 'running') {
    notesState.taskRunSince = Date.now();
    startLiveTicker();
  } else {
    notesState.taskRunSince = null;
    if (state.runState === 'idle') handleStartPause();
  }
}

function activateSelected() {
  const sel = notesState.selected;
  if (!sel) return;
  if (sel.type === 'note') activateNote(sel.noteId);
  else if (sel.type === 'task' && !sel.isTextType) activateTask(sel.taskId, sel.el);
}

function editSelected() {
  const sel = notesState.selected;
  if (!sel) return;

  if (sel.type === 'note') {
    const noteId = sel.noteId;
    if (!sel.el.closest('.timeline-note').classList.contains('is-open')) toggleNote(noteId);
    const titleSpan = sel.el.querySelector('.note-title');
    if (!titleSpan) return;
    startInlineEdit(sel.el, titleSpan.textContent, (newTitle) => {
      ipcRenderer.invoke('note-update', { noteId, title: newTitle }).catch(() => {});
      const note = notesState.notes.find((n) => n.id === noteId);
      if (note) note.title = newTitle;
    });
  } else if (sel.type === 'task') {
    const { taskId, noteId } = sel;
    const textSpan = sel.el.querySelector('.task-text');
    if (!textSpan) return;
    startInlineEdit(sel.el, textSpan.textContent, (newText) => {
      ipcRenderer.invoke('task-update', { taskId, text: newText }).catch(() => {});
      const note = notesState.notes.find((n) => n.id === noteId);
      const task = (note && note.tasks || []).find((t) => t.id === taskId);
      if (task) task.text = newText;
    });
  }
}

function startInlineEdit(el, currentText, onCommit) {
  const textEl = el.querySelector('.task-text, .note-title');
  if (!textEl) return;
  const input = document.createElement('input');
  input.className = 'inline-edit-input';
  input.type = 'text';
  input.value = currentText;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const newText = input.value.trim() || currentText;
    const span = document.createElement('span');
    span.className = textEl.className;
    span.textContent = newText;
    input.replaceWith(span);
    if (newText !== currentText) onCommit(newText, span);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') { input.value = currentText; input.blur(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      commit();
      const noteId = parseInt(el.closest('.timeline-note') && el.closest('.timeline-note').dataset.noteId, 10);
      if (noteId) {
        const noteEl = noteEls.notesList.querySelector(`.timeline-note[data-note-id="${noteId}"]`);
        if (noteEl && !noteEl.classList.contains('is-open')) toggleNote(noteId);
        const taskInput = noteEl && noteEl.querySelector('.task-add-row input');
        if (taskInput) setTimeout(() => taskInput.focus(), noteEl && !noteEl.classList.contains('is-open') ? 320 : 30);
      }
    }
  });
}

// ============================================================
// Notes: Project Management
// ============================================================

function renderProjectFilter() {
  const row = noteEls.projectFilterRow;
  if (!row) return;
  if (!notesState.projects.length) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  const allActive = notesState.activeProjectId === null;
  row.innerHTML = [
    `<button class="proj-filter-pill${allActive ? ' is-active' : ''}" data-pid="all">All</button>`,
    ...notesState.projects.map((p) => {
      const active = notesState.activeProjectId === p.id;
      return `<button class="proj-filter-pill${active ? ' is-active' : ''}" data-pid="${p.id}" style="--proj-color:${p.color}">${escapeHtml(p.name)}</button>`;
    }),
  ].join('');
  row.querySelectorAll('.proj-filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pid;
      notesState.activeProjectId = pid === 'all' ? null : parseInt(pid, 10);
      renderProjectFilter();
      renderNotes();
    });
  });
}

function openProjectPicker(noteId, anchorEl) {
  notesState.pickerNoteId = noteId;
  const picker = noteEls.projectPicker;
  const list = noteEls.projPickList;
  const input = noteEls.projPickInput;
  if (!picker || !list) return;

  const note = notesState.notes.find((n) => n.id === noteId);
  const currentProjectId = note && note.projectId;

  list.innerHTML = [
    `<div class="proj-pick-item${!currentProjectId ? ' is-current' : ''}" data-project-id="">None</div>`,
    ...notesState.projects.map((p) => {
      const active = currentProjectId === p.id;
      return `<div class="proj-pick-item${active ? ' is-current' : ''}" data-project-id="${p.id}"><span style="color:${p.color}">●</span>${escapeHtml(p.name)}</div>`;
    }),
  ].join('');

  list.querySelectorAll('.proj-pick-item').forEach((item) => {
    item.addEventListener('click', () => {
      const pid = item.dataset.projectId ? parseInt(item.dataset.projectId, 10) : null;
      assignNoteProject(noteId, pid);
      closeProjectPicker();
    });
  });

  if (input) input.value = '';

  const rect = anchorEl.getBoundingClientRect();
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = Math.max(4, rect.right - 160) + 'px';
  picker.classList.add('is-open');
  if (input) setTimeout(() => input.focus(), 30);
}

function closeProjectPicker() {
  notesState.pickerNoteId = null;
  if (noteEls.projectPicker) noteEls.projectPicker.classList.remove('is-open');
}

function assignNoteProject(noteId, projectId) {
  ipcRenderer.invoke('note-set-project', { noteId, projectId: projectId || null }).then((res) => {
    if (!res || !res.ok) return;
    const note = notesState.notes.find((n) => n.id === noteId);
    if (!note) return;
    const proj = notesState.projects.find((p) => p.id === projectId);
    note.projectId = proj ? proj.id : null;
    note.projectName = proj ? proj.name : null;
    note.projectColor = proj ? proj.color : null;
    renderProjectFilter();
    renderNotes();
  }).catch(() => {});
}

// ============================================================
// Startup
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
