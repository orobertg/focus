/* ============================================
   Focus Bubbles - Rust Core Stub (Temporary)
   TODO: Replace with native Neon addon
   ============================================ */

// This is a JavaScript stub that mimics the Rust core API
// It will be replaced with the compiled Neon native addon

class PomodoroCore {
  constructor() {
    this.session = null;
    // Default configuration
    this.config = {
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      cycleLen: 4,
    };
  }

  // Configure the core with user settings
  configure(workMin, shortBreakMin, longBreakMin, cycleLen) {
    this.config = {
      workMin: workMin || 25,
      shortBreakMin: shortBreakMin || 5,
      longBreakMin: longBreakMin || 15,
      cycleLen: cycleLen || 4,
    };
    console.log('[Core Stub] Configured with:', this.config);
  }

  startWork() {
    const now = Date.now();
    this.session = {
      sessionId: crypto.randomUUID(),
      phase: 'Work',
      runState: 'Running',
      millisTotal: this.config.workMin * 60 * 1000, // Use configured work duration
      startedAt: now,
      carriedMs: 0,
      cycleIndex: 1,
      workMin: this.config.workMin,
      shortBreakMin: this.config.shortBreakMin,
      longBreakMin: this.config.longBreakMin,
      cycleLen: this.config.cycleLen,
    };
    return this.getSnapshot();
  }

  startBreak(breakMinutes, isLongBreak = false) {
    const now = Date.now();
    this.session = {
      sessionId: crypto.randomUUID(),
      phase: isLongBreak ? 'LongBreak' : 'ShortBreak',
      runState: 'Running',
      millisTotal: breakMinutes * 60 * 1000,
      startedAt: now,
      carriedMs: 0,
      cycleIndex: this.session ? this.session.cycleIndex : 1,
      workMin: this.config.workMin,
      shortBreakMin: this.config.shortBreakMin,
      longBreakMin: this.config.longBreakMin,
      cycleLen: this.config.cycleLen,
    };
    console.log(`[Core Stub] Started ${isLongBreak ? 'long' : 'short'} break: ${breakMinutes} minutes`);
    return this.getSnapshot();
  }

  pauseTimer() {
    if (this.session && this.session.runState === 'Running') {
      const now = Date.now();
      this.session.carriedMs = now - this.session.startedAt + this.session.carriedMs;
      this.session.runState = 'Paused';
    }
    return this.getSnapshot();
  }

  resumeTimer() {
    if (this.session && this.session.runState === 'Paused') {
      this.session.startedAt = Date.now();
      this.session.runState = 'Running';
    }
    return this.getSnapshot();
  }

  stopTimer() {
    this.session = null;
    return {
      sessionId: '',
      phase: 'Work',
      runState: 'Idle',
      millisTotal: 0,
      millisElapsed: 0,
      cycleIndex: 0,
    };
  }

  getSnapshot() {
    if (!this.session) {
      return {
        sessionId: '',
        phase: 'Work',
        runState: 'Idle',
        millisTotal: 0,
        millisElapsed: 0,
        cycleIndex: 0,
      };
    }

    let millisElapsed = this.session.carriedMs;
    if (this.session.runState === 'Running') {
      millisElapsed += Date.now() - this.session.startedAt;
    }

    return {
      sessionId: this.session.sessionId,
      phase: this.session.phase,
      runState: this.session.runState,
      millisTotal: this.session.millisTotal,
      millisElapsed: Math.min(millisElapsed, this.session.millisTotal),
      cycleIndex: this.session.cycleIndex,
    };
  }
}

// Export singleton instance
const core = new PomodoroCore();

module.exports = {
  configure: (workMin, shortBreakMin, longBreakMin, cycleLen) => {
    core.configure(workMin, shortBreakMin, longBreakMin, cycleLen);
  },
  startWork: () => JSON.stringify(core.startWork()),
  startBreak: (breakMinutes, isLongBreak) => JSON.stringify(core.startBreak(breakMinutes, isLongBreak)),
  pauseTimer: () => JSON.stringify(core.pauseTimer()),
  resumeTimer: () => JSON.stringify(core.resumeTimer()),
  stopTimer: () => JSON.stringify(core.stopTimer()),
  getSnapshot: () => JSON.stringify(core.getSnapshot()),
};

