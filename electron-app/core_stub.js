/* ============================================
   Focus Bubbles - Rust Core Stub (Temporary)
   TODO: Replace with native Neon addon
   ============================================ */

// This is a JavaScript stub that mimics the Rust core API
// It will be replaced with the compiled Neon native addon

class PomodoroCore {
  constructor() {
    this.session = null;
  }

  startWork() {
    const now = Date.now();
    this.session = {
      sessionId: crypto.randomUUID(),
      phase: 'Work',
      runState: 'Running',
      millisTotal: 25 * 60 * 1000,
      startedAt: now,
      carriedMs: 0,
      cycleIndex: 1,
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      cycleLen: 4,
    };
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
  startWork: () => JSON.stringify(core.startWork()),
  pauseTimer: () => JSON.stringify(core.pauseTimer()),
  resumeTimer: () => JSON.stringify(core.resumeTimer()),
  stopTimer: () => JSON.stringify(core.stopTimer()),
  getSnapshot: () => JSON.stringify(core.getSnapshot()),
};

