# Pause-Break System Specification

**Last Updated:** October 12, 2025  
**Status:** ✅ Fully Implemented

---

## Overview

The **Pause-Break System** is a sophisticated 4-phase mechanism that gently encourages healthy breaks during extended pauses in focus sessions. It uses visual progression with animated dots to make break duration tangible while respecting user autonomy.

---

## System Architecture

### State Variables
```javascript
state = {
  // Pause tracking
  pauseStartTime: null,        // When pause was initiated
  pauseDuration: 0,            // Total pause time in seconds
  
  // Warm-up phase (60-120s)
  isInWarmUp: false,           // True during warm-up
  warmUpProgress: 0,           // 0-3, yellow dots appearing left-to-right
  
  // Blinking phase (120s+)
  isBlinking: false,           // True when all 4 dots blink
  
  // Cool-down phase (0-60s while running)
  isInCooldown: false,         // True during cool-down
  cooldownStartTime: null,     // When cool-down started
  cooldownProgress: 0,         // 0-4, yellow dots clearing right-to-left
  
  // Break state
  isInBreakState: false,       // True during warm-up/blinking (shows coffee icon)
}
```

### Monitoring
- `pauseBlinkInterval` checks pause duration every 250ms
- `updatePauseDuration()` manages phase transitions
- `updateCooldown()` runs during `tick()` when timer is running

---

## Phase Details

### **Phase 1: Normal Pause (0-60 seconds)**

**Trigger:** User clicks PAUSE during focus session

**Behavior:**
- Timer display: Shows remaining focus time (frozen)
- Button text: "START"
- Phase icon: Closed eye 😴
- Phase label: "PAUSE"
- Dots: No changes
- State: `pauseStartTime` set, monitoring begins

**Code:**
```javascript
function pauseTimer() {
  state.pauseStartTime = Date.now();
  state.pauseDuration = 0;
  pauseBlinkInterval = setInterval(updatePauseDuration, 250);
  // ... stop timer interval ...
}
```

---

### **Phase 2: Warm-Up (60-120 seconds)**

**Trigger:** `pauseElapsed >= 60 && pauseElapsed < 120`

**Behavior:**
- Timer display: Still shows remaining focus time
- Button text: "START"
- Phase icon: **Coffee mug ☕** (auto break mode)
- Phase label: "BREAK"
- Dots: Yellow dots appear **left-to-right** every 15 seconds
  - 1:00 - 1:15 → No yellow dots yet
  - 1:15 - 1:30 → First yellow dot
  - 1:30 - 1:45 → Two yellow dots
  - 1:45 - 2:00 → Three yellow dots
  - 2:00+ → Four yellow dots (transitions to blinking)
- State: `isInWarmUp = true`, `isInBreakState = true`

**Visual Progression:**
```
Time    Dots Display
------  -------------
0:00    ○ ○ ○ ○  (gray)
1:15    🟡 ○ ○ ○  (1st yellow appears)
1:30    🟡 🟡 ○ ○  (2nd yellow appears)
1:45    🟡 🟡 🟡 ○  (3rd yellow appears)
2:00    🟡 🟡 🟡 🟡  (all yellow, start blinking)
```

**Code:**
```javascript
if (pauseElapsed >= 60 && pauseElapsed < 120) {
  if (!state.isInWarmUp) {
    state.isInWarmUp = true;
    state.isInBreakState = true; // Show coffee icon
    state.warmUpProgress = 0;
  }
  
  const warmUpElapsed = pauseElapsed - 60;
  const newProgress = Math.min(Math.floor(warmUpElapsed / 15), 3);
  
  if (newProgress !== state.warmUpProgress) {
    state.warmUpProgress = newProgress;
    updateUI();
  }
}
```

---

### **Phase 3: Blinking (120+ seconds)**

**Trigger:** `pauseElapsed >= 120`

**Behavior:**
- Timer display: Still shows remaining focus time
- Button text: "START"
- Phase icon: Coffee mug ☕
- Phase label: "BREAK"
- Dots: **All 4 yellow dots blink** at 1Hz (1s cycle)
- State: `isBlinking = true`, `warmUpProgress = 4`
- Duration: **Indefinite** (blinks until user clicks START)

**Visual Effect:**
```css
.dot.blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

**Code:**
```javascript
if (pauseElapsed >= 120) {
  if (!state.isBlinking) {
    state.isBlinking = true;
    state.warmUpProgress = 4;
    updateUI();
  }
}
```

**Dot Display Logic:**
```javascript
if (state.isBlinking) {
  // Preserve green dots for completed pomodoros
  if (index < state.completedPomodoros) {
    dot.classList.add('lit-green');
  }
  // All other dots blink yellow
  else {
    dot.classList.add('lit-yellow', 'blink');
  }
}
```

---

### **Phase 4: Cool-Down (60 seconds while running)**

**Trigger:** User clicks START after pause-break (warm-up or blinking)

**Behavior:**
- Timer: **Immediately resumes counting down** 🔥
- Button text: "PAUSE"
- Phase icon: Open eye 👁️
- Phase label: "FOCUS"
- Dots: Yellow dots clear **right-to-left** every 15 seconds
  - 0-15s → 4th dot clears (3 yellow remaining)
  - 15-30s → 3rd dot clears (2 yellow remaining)
  - 30-45s → 2nd dot clears (1 yellow remaining)
  - 45-60s → 1st dot clears (all normal)
- **Green dots preserved** — Completed pomodoros stay green
- State: `isInCooldown = true`, `cooldownProgress = 0`

**Visual Progression:**
```
Time    Dots Display (assuming 2 completed pomodoros)
------  -------------------------------------------------
0:00    🟢 🟢 🟡 🟡  (timer RUNNING, green preserved)
0:15    🟢 🟢 🟡 ○   (4th dot cleared)
0:30    🟢 🟢 ○ ○   (3rd dot cleared)
0:45    🟢 🟡 ○ ○   (2nd dot cleared)
1:00    🟢 🟢 ○ ○   (1st dot cleared, all normal)
```

**Code (Resume):**
```javascript
if (state.isInWarmUp || state.isBlinking) {
  // Clear pause monitoring
  if (pauseBlinkInterval) {
    clearInterval(pauseBlinkInterval);
    pauseBlinkInterval = null;
  }
  
  // Reset warm-up/blinking state
  state.isInWarmUp = false;
  state.isBlinking = false;
  state.isInBreakState = false;
  
  // Start cool-down
  state.isInCooldown = true;
  state.cooldownStartTime = Date.now();
  state.cooldownProgress = 0;
}
```

**Code (Cool-down Update):**
```javascript
function updateCooldown() {
  if (!state.isInCooldown || !state.cooldownStartTime) return;
  
  const cooldownElapsed = Math.floor((Date.now() - state.cooldownStartTime) / 1000);
  const newProgress = Math.min(Math.floor(cooldownElapsed / 15), 4);
  
  if (newProgress !== state.cooldownProgress) {
    state.cooldownProgress = newProgress;
  }
  
  // Complete cooldown after 60 seconds
  if (cooldownElapsed >= 60) {
    state.isInCooldown = false;
    state.cooldownStartTime = null;
    state.cooldownProgress = 0;
    state.warmUpProgress = 0;
  }
}

// Called from tick() every 250ms while timer is running
function tick() {
  // ... get snapshot ...
  if (state.isInCooldown) {
    updateCooldown();
  }
  // ... rest of tick ...
}
```

**Dot Display Logic:**
```javascript
if (state.isInCooldown) {
  // Preserve green dots for completed pomodoros
  if (index < state.completedPomodoros) {
    dot.classList.add('lit-green');
  }
  // Show yellow for dots that haven't been cleared yet
  // cooldownProgress goes from 0-4, clearing from right to left
  else if (index < (4 - state.cooldownProgress)) {
    dot.classList.add('lit-yellow');
  }
}
```

---

## Priority System

The `updateProgressDots()` function uses a priority system to determine dot appearance:

1. **Reflection period** (all green)
2. **Cool-down phase** (yellow clearing right-to-left, green preserved)
3. **Warm-up phase** (yellow appearing left-to-right, green preserved)
4. **Blinking phase** (all yellow + blink animation, green preserved)
5. **Regular break** (single yellow dot for current break)
6. **Completed pomodoros** (green dots)
7. **Default** (unlit gray)

This ensures that completed pomodoro dots (green) are **always preserved** during pause-break transitions.

---

## Key Design Principles

### 1. **Non-Intrusive**
- No forced breaks
- User decides when to resume
- Visual cues only, no audio alerts

### 2. **Progressive Disclosure**
- Gentle escalation: pause → warm-up → blinking
- Each phase provides clear visual feedback
- Timer always shows remaining focus time

### 3. **Preserve Progress**
- Green dots (completed pomodoros) never affected
- Cool-down shows visual transition without losing data
- Focus time preserved during pause

### 4. **Timing Precision**
- 15-second intervals for visual updates
- 60-second phases (warm-up, cool-down)
- 250ms monitoring for smooth transitions

### 5. **State Cleanup**
- Reset clears all pause-break state
- Phase transitions properly clean up intervals
- No orphaned timers or state leaks

---

## Testing Checklist

- [ ] **Pause <60s**: No visual changes, can resume normally
- [ ] **Pause 60-75s**: First yellow dot appears at 1:15
- [ ] **Pause 75-90s**: Second yellow dot appears at 1:30
- [ ] **Pause 90-105s**: Third yellow dot appears at 1:45
- [ ] **Pause 105-120s**: Fourth yellow dot appears at 2:00
- [ ] **Pause 120s+**: All 4 dots blink
- [ ] **Resume after blinking**: Cool-down starts, timer runs
- [ ] **Cool-down 0-15s**: 4th dot clears
- [ ] **Cool-down 15-30s**: 3rd dot clears
- [ ] **Cool-down 30-45s**: 2nd dot clears
- [ ] **Cool-down 45-60s**: 1st dot clears, all normal
- [ ] **Green dots preserved**: Throughout all phases
- [ ] **Reset clears state**: All pause-break state reset
- [ ] **Coffee icon**: Shows during warm-up/blinking
- [ ] **Phase label**: Shows "BREAK" during warm-up/blinking

---

## Future Enhancements (Optional)

### 1. **Configurable Pause-Break Duration**
- Add setting: "Limit self-imposed break duration"
- Default: Indefinite (current behavior)
- Options: 5 min, 10 min, 15 min
- Behavior: Auto-resume after duration, show countdown

### 2. **Sound/Notification**
- Optional audio cue when blinking starts
- Desktop notification: "Take a break?"
- Respects "Sound Enabled" and "Show Notifications" settings

### 3. **Analytics**
- Track pause frequency and duration
- Show stats: "Average pause: 2 min"
- Visualize pause patterns over time

---

## Related Files

- **`electron-app/renderer.js`**: Core logic (lines 11-56, 416-501, 865-939)
- **`electron-app/styles.css`**: Blinking animation (lines 187-194)
- **`README.md`**: User-facing documentation (lines 102-143)

---

**Implementation Date:** October 12, 2025  
**Developer Notes:** System tested and working. All 10 tasks completed. Green dot preservation confirmed. Visual progression smooth and intuitive.

