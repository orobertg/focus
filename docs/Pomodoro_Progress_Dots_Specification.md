# Pomodoro Progress Dots Specification

## Overview
The Focus app implements the classic Pomodoro Technique with visual feedback through four progress dots inside the timer ring. These dots provide real-time status of completed pomodoros, break transitions, and reflection periods.

## Core Pomodoro Technique Implementation

### Standard Cycle
1. **Focus Session**: 25 minutes of focused work (configurable)
2. **Short Break**: 5 minutes (configurable)
3. **After 4 consecutive pomodoros**: Long break (15 minutes, configurable)
4. **Reflection Period**: 10+ minutes before starting a new cycle

### Visual States

## Progress Dots Behavior

### 1. **Completed Pomodoros (Green Dots)**
- **Purpose**: Show how many pomodoros have been completed in the current cycle
- **Behavior**: 
  - Each dot lights up **solid green** when a full pomodoro is completed
  - Dots light up one at a time, from left to right
  - Maximum of 4 dots (representing 4 pomodoros before long break)
  - Green dots persist until the 4-pomodoro cycle is complete and reflection period begins

**Example Progression**:
```
After 1st pomodoro: ● ○ ○ ○  (1 green, 3 gray)
After 2nd pomodoro: ● ● ○ ○  (2 green, 2 gray)
After 3rd pomodoro: ● ● ● ○  (3 green, 1 gray)
After 4th pomodoro: ● ● ● ●  (4 green, 0 gray)
```

### 2. **Break Warm-Up (Yellow Dots - Progressive Fill)**
- **Purpose**: Visual countdown during pause before entering break mode
- **Trigger**: When timer is paused for 15+ seconds
- **Behavior**:
  - Dots light up **yellow**, one at a time, every 15 seconds
  - Yellow **overlays** any existing green dots (completed pomodoros remain underneath)
  - After 60 seconds (4 dots yellow), transition to BREAK mode
  - Sequence: **Left to right**
  
**Progression** (assuming 2 completed pomodoros):
```
At pause start:    ●● ○ ○  (2 green, 2 gray)
0-15 sec paused:   🟡● ○ ○  (1 yellow overlay, 1 green, 2 gray)
15-30 sec paused:  🟡🟡 ○ ○  (2 yellow overlays, 2 gray)
30-45 sec paused:  🟡🟡🟡 ○  (3 yellow overlays, 1 gray)
45-60 sec paused:  🟡🟡🟡🟡  (4 yellow overlays)
At 60 sec:         Status → BREAK, all 4 blink yellow
```

### 3. **Break Mode (Yellow Blinking Dots)**
- **Purpose**: Indicate active break period
- **Trigger**: All 4 yellow dots filled (60 seconds of pause)
- **Behavior**:
  - All 4 dots **blink yellow** in unison
  - Phase label changes to "BREAK"
  - Coffee mug icon ☕ replaces eye icon
  - Continues until timer is resumed

### 4. **Break Cool-Down (Yellow Dots - Progressive Clear)**
- **Purpose**: Transition from break back to focus mode
- **Trigger**: Timer resumed from BREAK mode (clicking START/pause button)
- **Behavior**:
  - Yellow dots **clear** one at a time, every 15 seconds
  - Sequence: **Right to left** (reverse of warm-up)
  - As each yellow dot clears, the **original color underneath is restored** (green if pomodoro was completed, gray if not)
  - After 60 seconds, all yellow overlays removed, showing original dot states
  - Green completed-pomodoro dots remain visible throughout

**Progression** (assuming 2 completed pomodoros before break):
```
Break ends (START):  🟡🟡🟡🟡  (all 4 yellow blinking)
0-15 sec resumed:    🟡🟡🟡 ○  (rightmost clears → gray)
15-30 sec resumed:   🟡🟡 ○ ○  (2nd from right clears → gray)
30-45 sec resumed:   🟡 ● ○ ○  (3rd from right clears → green restored!)
45-60 sec resumed:   ● ● ○ ○   (leftmost clears → green restored!)
At 60 sec:           ● ● ○ ○   (back to showing 2 completed pomodoros)
```

### 5. **Reflection Period**
- **Purpose**: Encourage longer break after 4 consecutive pomodoros
- **Trigger**: 4th pomodoro completed
- **Behavior**:
  - Phase label changes to "REFLECT"
  - All 4 green dots remain visible
  - Minimum 10 minutes before next cycle can begin
  - After reflection, dots reset to gray for new cycle

**States**:
```
During reflection:  ● ● ● ●  (4 green) + "REFLECT" label
After reflection:   ○ ○ ○ ○  (reset for new cycle)
```

## Phase Labels

## Complete Example Flow

Here's a complete example showing how dots behave through a full cycle:

```
1. Start first pomodoro:    ○ ○ ○ ○  FOCUS
2. Complete first:          ● ○ ○ ○  FOCUS (1 green)
3. Complete second:         ● ● ○ ○  FOCUS (2 green)
4. Pause after 2nd:         ● ● ○ ○  PAUSE (still showing 2 green)
   +15s paused:             🟡● ○ ○  PAUSE (yellow overlay on 1st)
   +30s paused:             🟡🟡 ○ ○  PAUSE (yellow overlay on 2nd too)
   +45s paused:             🟡🟡🟡 ○  PAUSE (yellow on 3rd)
   +60s paused:             🟡🟡🟡🟡  BREAK (all yellow, blinking)
5. Resume from break:       🟡🟡🟡🟡  FOCUS (start cool-down)
   +15s resumed:            🟡🟡🟡 ○  FOCUS (rightmost cleared)
   +30s resumed:            🟡🟡 ○ ○  FOCUS (2nd cleared)
   +45s resumed:            🟡 ● ○ ○  FOCUS (2nd green restored!)
   +60s resumed:            ● ● ○ ○  FOCUS (1st green restored!)
6. Complete third:          ● ● ● ○  FOCUS (3 green)
7. Complete fourth:         ● ● ● ●  REFLECT ⭐ (4 green, blue star, 10 min minimum)
8. After 10+ min, restart:  ○ ○ ○ ○  FOCUS (new cycle begins)
```

**Key Points:**
- Green dots = completed pomodoros (persistent)
- Yellow = temporary overlay during pause/break transitions
- Yellow always clears to reveal what was underneath
- Warm-up: yellow fills L→R, overlaying green
- Cool-down: yellow clears R→L, restoring green

### Label States
1. **"FOCUS"**: Default state, timer counting or idle
2. **"PAUSE"**: Timer paused (0-60 seconds), yellow warm-up in progress
3. **"BREAK"**: Break mode active (after 60s pause), yellow blinking dots
4. **"REFLECT"**: Post-cycle reflection period (after 4 pomodoros)

## Icon States

### Phase Icons
1. **Closed Eye** 👁️‍🗨️: Idle or paused
2. **Open Eye** 👁️: Timer actively counting down
3. **Coffee Mug** ☕: Break mode active
4. **Blue Star** ⭐: Reflection period (achievement celebration!)

## State Transitions

### Normal Pomodoro Flow
```
START → FOCUS (running) → Complete → Green dot +1 → Short break
→ FOCUS (running) → Complete → Green dot +2 → Short break
→ FOCUS (running) → Complete → Green dot +3 → Short break
→ FOCUS (running) → Complete → Green dot +4 → REFLECT
→ (10+ min) → Reset cycle → FOCUS
```

### Break Warm-Up Flow
```
FOCUS (running) → PAUSE → Yellow dot 1 (15s)
→ Yellow dot 2 (30s) → Yellow dot 3 (45s) → Yellow dot 4 (60s)
→ BREAK (yellow blinking)
```

### Break Cool-Down Flow
```
BREAK → Resume → Yellow clear from right (15s intervals)
→ All yellow cleared (60s) → Return to FOCUS with green dots
```

## Implementation Notes

### Timers Required
1. **Main pomodoro timer**: Tracks focus/break duration
2. **Pause duration timer**: Tracks time spent in pause (for warm-up)
3. **Resume duration timer**: Tracks time since resumed from break (for cool-down)
4. **Reflection timer**: Tracks minimum 10-minute reflection period

### State Variables
```javascript
{
  completedPomodoros: 0-4,        // Green dots count
  pauseWarmUpProgress: 0-4,       // Yellow dots during pause
  breakCoolDownProgress: 0-4,     // Yellow dots clearing during resume
  inReflectionPeriod: boolean,    // After 4 pomodoros
  reflectionStartTime: timestamp, // Track 10-min minimum
}
```

### Visual Priority
When multiple states could apply to dots:
1. **Cool-down yellow** (highest priority - actively clearing)
2. **Warm-up yellow** (filling during pause)
3. **Blinking yellow** (during break)
4. **Solid green** (completed pomodoros - base state)
5. **Gray** (default unfilled)

## User Experience Goals

1. **Clarity**: User always knows current phase and progress
2. **Motivation**: Visual feedback of completed pomodoros encourages continuation
3. **Natural breaks**: Smooth transition into/out of breaks with warm-up/cool-down
4. **Reflection**: Enforces healthy long breaks after intense focus periods
5. **Non-intrusive**: Animations are subtle, not distracting

## Configuration

All durations should be configurable in settings:
- Focus session duration (default: 25 min)
- Short break duration (default: 5 min)
- Long break duration (default: 15 min)
- Pomodoros before long break (default: 4)
- Reflection period minimum (default: 10 min)
- Break warm-up duration (default: 60 sec / 15 sec per dot)
- Break cool-down duration (default: 60 sec / 15 sec per dot)

## Future Enhancements

1. **Daily statistics**: Track total pomodoros completed per day
2. **Streak tracking**: Consecutive days with completed cycles
3. **Sound notifications**: Gentle chime for phase transitions
4. **Custom dot colors**: User preference for completed pomodoro color
5. **Animation customization**: Blink speed, transition effects

