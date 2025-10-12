# Focus App 🎯

> A lightweight, non-intrusive Pomodoro timer with click-through floating UI — built with Electron, React, and Rust for distraction-free focus work.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Status](https://img.shields.io/badge/status-Electron%20Ready-success)]()
[![Click-Through](https://img.shields.io/badge/click--through-Working!-brightgreen)]()

---

## ✅ Electron App - Phase 2 Complete (100%)!

**The migration from Flutter to Electron is SUCCESSFUL and the app is fully functional!**

**Current Status:** Phase 1 (Foundation) ✅ Complete | Phase 2 (Core Features) ✅ Complete!

**What Works NOW:**
- ✅ **Click-through functionality** - Perfect stability, no crashes
- ✅ **Beautiful timer UI** - 280×340 rounded square with progress ring
- ✅ **Full Pomodoro Technique** - Complete implementation with visual progress
- ✅ **Pause-Break System** - 4-phase gentle break encouragement with visual progression
- ✅ **Auto-start controls** - Independently control break and pomodoro auto-start
- ✅ **Progress dots** - Gray (not started) → Yellow (break) → Green (complete)
- ✅ **Timer controls** - Start, pause, reset all functional
- ✅ **Independent toolbar** - Separate draggable window with IPC communication
- ✅ **Reflection periods** - Blue star celebration after 4 full cycles
- ✅ **Settings panel** - Inline 3-tab interface (Duration/Options/Notifications)
- ✅ **Keyboard navigation** - Complete keyboard-driven operation
- ✅ **Global hotkeys** - ALT+SHIFT+P/C/O for visibility, click-through, options
- ✅ **System tray** - Background operation
- ✅ **Position persistence** - Windows remember their locations

📖 **Current Status:** [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)  
📋 **Full Roadmap:** [docs/MVP_Milestone_Plan.md](docs/MVP_Milestone_Plan.md)  
📝 **Specifications:** [docs/Specifications.md](docs/Specifications.md)  
🎯 **Next Sprint:** [docs/milestones/MILESTONE_POLISH.md](docs/milestones/MILESTONE_POLISH.md)

**Quick Start:**
```bash
cd electron-app
npm install
npm start
```

**Test Click-Through:**
```bash
# Press ALT+SHIFT+C to toggle click-through mode
# When enabled, you can click through timer to apps behind it
```

---

## ✨ Features

### Electron Implementation (Current) ✅
- ✅ **Click-Through Window** — Perfect stability with `setIgnoreMouseEvents()`
- ✅ **Floating Timer Bubble** — Always-on-top, draggable circular timer (280px)
- ✅ **Precision Timing** — Rust-powered Pomodoro engine (stub implementation)
- ✅ **Beautiful UI** — Circular progress ring, phase icons, animated dots
- ✅ **Timer Controls** — Start, Pause, Reset functionality
- ✅ **Pause-Break System** — 4-phase visual progression (pause → warm-up → blinking → cool-down)
- ✅ **Global Hotkeys** — ALT+SHIFT+P (toggle), C (click-through), O (options)
- ✅ **Position Memory** — Persists across sessions with electron-store
- ✅ **System Tray** — Background running, tray menu
- ✅ **Full Pomodoro Technique** — Progress tracking, break transitions, reflection periods
- ✅ **Keyboard Navigation** — Complete keyboard-driven operation with visual focus indicators

---

## 🍅 Pomodoro Technique Implementation

Focus App implements the complete **Pomodoro Technique** with visual feedback and gentle transitions to help you maintain deep focus without distraction.

### How It Works

#### **1. Focus Sessions** 🎯
- Work in **25-minute focused intervals** (configurable)
- Open eye icon 👁️ shows you're actively focusing
- Progress ring fills as time elapses
- **Auto-start Pomodoros** setting controls if next session starts automatically after break

#### **2. Break Transition** ☕
When a pomodoro completes:
- The dot for that session turns **yellow** (break in progress)
- Coffee mug icon appears
- **Auto-start Breaks** setting controls behavior:
  - **Enabled**: Break timer starts automatically
  - **Disabled**: Break screen appears, press START to begin
- Take your well-deserved rest!

#### **3. Completing the Cycle** ✅
When break finishes:
- The yellow dot turns **green** (full cycle complete!)
- Progress ring shows next pomodoro countdown
- **Auto-start Pomodoros** setting controls behavior:
  - **Enabled**: Next pomodoro starts automatically
  - **Disabled**: Focus screen appears, press START to begin

#### **4. Visual Progress** 📊
- **Gray dot** ○ = Cycle not started yet
- **Yellow dot** 🟡 = Break in progress for this cycle
- **Green dot** 🟢 = Fully completed (pomodoro + break done)

#### **5. Pause-Break System** ⏸️☕
A sophisticated system that gently encourages breaks during extended pauses:

**Phase 1: Normal Pause (0-60s)**
- Click PAUSE during focus session
- Timer display shows remaining time (frozen)
- Button shows START
- No visual changes

**Phase 2: Warm-Up (60s-120s)**
- After **1 minute** of pause, automatic break mode initiates
- Coffee mug icon ☕ appears
- Yellow dots appear **left-to-right** every 15 seconds:
  - 1:15 → First yellow dot
  - 1:30 → Second yellow dot
  - 1:45 → Third yellow dot
  - 2:00 → Fourth yellow dot
- Timer continues to show remaining focus time

**Phase 3: Blinking (120s+)**
- After **2 minutes** of pause, all 4 yellow dots blink
- Encourages you to click START and resume
- Blinking continues indefinitely until you resume
- Timer still shows remaining focus time

**Phase 4: Cool-Down (60s while running)**
- When you click START after pause-break:
  - Focus timer **immediately resumes** counting down
  - Yellow dots clear **right-to-left** every 15 seconds simultaneously
  - 0-15s: 4th dot clears
  - 15-30s: 3rd dot clears
  - 30-45s: 2nd dot clears
  - 45-60s: 1st dot clears (all normal)
- **Green dots preserved** — Completed pomodoros stay green throughout
- This creates a smooth visual transition back to focus mode

**Why This Works:**
- Encourages healthy breaks during long pauses
- Visual progression makes break duration tangible
- Gentle nudging without forced interruptions
- Preserves progress tracking (green dots untouched)
- Respects your autonomy (you choose when to resume)

#### **6. Reflection Period** ⭐
After completing **4 full cycles** (pomodoro + break):
- Blue star icon ⭐ appears (celebration!)
- All 4 dots show **solid green**
- Label shows "REFLECT"
- **10-minute minimum** enforced before starting new cycle
- Time to appreciate your productive work!

### Visual Progress Tracking

```
Full Cycle Flow:
○ ○ ○ ○  →  Start (all gray)
🟡○ ○ ○  →  Pomodoro 1 complete, break in progress (yellow)
🟢○ ○ ○  →  Break 1 complete, full cycle done (green)
🟢🟡○ ○  →  Pomodoro 2 complete, break in progress
🟢🟢○ ○  →  Break 2 complete, 2 full cycles done
🟢🟢🟡○  →  Pomodoro 3 complete, break in progress
🟢🟢🟢○  →  Break 3 complete, 3 full cycles done
🟢🟢🟢🟡  →  Pomodoro 4 complete, break in progress
🟢🟢🟢🟢  →  Break 4 complete → ⭐ REFLECT (10 min minimum)
```

### Detailed Example (2nd Cycle)

```
State                   Dots        Phase       Auto-Behavior
─────────────────────   ─────────   ─────────   ──────────────────────────
1 cycle complete        🟢○○○       FOCUS       Ready to start Pomodoro 2
Pomodoro 2 running      🟢○○○       FOCUS       Timer counting down
Pomodoro 2 finishes     🟢🟡○○       BREAK       Auto-starts if enabled*
Break 2 running         🟢🟡○○       BREAK       Taking rest
Break 2 finishes        🟢🟢○○       FOCUS       Auto-starts if enabled**
Ready for Pomodoro 3    🟢🟢○○       FOCUS       Press START

* Auto-start Breaks setting in OPTIONS
** Auto-start Pomodoros setting in OPTIONS
```

### Why This Works

1. **Visual Progress** — Three states (gray/yellow/green) show clear status
2. **Flexible Auto-Start** — Control break and pomodoro auto-start independently
3. **Clear Feedback** — Yellow during break, green when fully complete
4. **Celebration** — Blue star rewards completing 4 full cycles
5. **Mandatory Rest** — 10-minute reflection prevents burnout
6. **Keyboard-Driven** — Full navigation with arrow keys, space, tab, and escape

### Configurable Settings

**DURATION Tab:**
- **Focus duration** (default: 25 min, range: 1-120 min)
- **Short break** (default: 5 min, range: 1-30 min)
- **Long break** (default: 15 min, range: 5-60 min)
- **Pomodoros per cycle** (default: 4, range: 1-10)

**OPTIONS Tab:**
- **Sound** (notification sounds)
- **Auto-start Breaks** (start break automatically after pomodoro)
- **Auto-start Pomodoros** (start next pomodoro automatically after break)
- **Always on Top** (keep timer window on top)

**NOTIFICATIONS Tab:**
- **Desktop Notifications** (system notifications for phase changes)

**Keyboard Shortcuts:**
- `ALT+SHIFT+O` — Open Options
- `ALT+SHIFT+P` — Toggle window visibility
- `ESC` — Save settings and return to timer
- `TAB` / `SHIFT+TAB` — Cycle through settings tabs
- `↑` / `↓` — Navigate settings options
- `←` / `→` — Adjust durations or navigate timer buttons
- `SPACE` — Activate button or toggle setting

📖 **Full Specification:** [docs/Pomodoro_Progress_Dots_Specification.md](docs/Pomodoro_Progress_Dots_Specification.md)

### Flutter Implementation (Archived) 🗃️
- ✅ **All UI components** — Reference for design
- ✅ **Notes Capture** — Quick note-taking with screenshot
- ✅ **SQLite Persistence** — Local database for sessions
- ✅ **Click-Through** — Successfully implemented using Electron framework, dropping Flutter.

### Next Steps (Phase 2) 📋
- Calendar & Task Management with drag-drop scheduling
- Stats, streaks, and productivity insights
- E2EE sync server for multi-device support
- AI-powered summaries (Ollama local, OpenAI/Anthropic cloud)

---

## 🎯 Design Philosophy

**Non-intrusive with Click-Through** — MUST allow users to work uninterrupted (bubbles "fade to background")  
**Local-first** — Your data lives on your machine; optional sync later  
**Precision-focused** — Rust core ensures accurate timing, even through sleep/wake  
**Keyboard-driven** — Full hotkey support for power users  
**Beautiful & Minimal** — Clean design inspired by modern productivity tools

---

## 🏗️ Architecture (Electron Migration)

```
┌─────────────────────────────────────────┐
│    Electron + React + TypeScript        │
│  • Draggable bubbles with click-through │
│  • Notes widget, screenshot capture     │
│  • System tray, global hotkeys          │
└──────────────┬──────────────────────────┘
               │ neon-bindings or IPC
┌──────────────┴──────────────────────────┐
│         Rust Core (Unchanged)           │
│  • Pomodoro engine (state machine)      │
│  • Monotonic timing + drift correction  │
│  • SQLite persistence                   │
└─────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** Electron 28+, React 18, TypeScript
- **Core:** Rust 1.70+ (existing `core/` crate)
- **Database:** SQLite (better-sqlite3 + rusqlite)
- **Build:** Vite + electron-builder
- **Package:** MSIX (Windows Store) + portable EXE

---

## 🚀 Quick Start (Coming Soon)

### Prerequisites

```bash
# Node.js
node --version     # 18.x or later

# Rust (for core engine)
cargo --version    # 1.70 or later
```

### Run the App

**Note:** Electron implementation in progress. Check back soon!

```bash
cd electron-app
npm install
npm run dev
```

---

## 📚 Documentation

### Core Documents
- **[docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)** — What's working now and next steps
- **[docs/Specifications.md](docs/Specifications.md)** — Product requirements and technical spec
- **[docs/MVP_Milestone_Plan.md](docs/MVP_Milestone_Plan.md)** — Full development roadmap

### Milestone Sprints
- **[docs/milestones/MILESTONE_POLISH.md](docs/milestones/MILESTONE_POLISH.md)** — Current sprint (Quick Polish)
- **[docs/milestones/MILESTONE_DATABASE.md](docs/milestones/MILESTONE_DATABASE.md)** — Future: Database integration
- **[docs/milestones/MILESTONE_RUST_CORE.md](docs/milestones/MILESTONE_RUST_CORE.md)** — Future: Native Rust module

### Migration History
- **[docs/ELECTRON_MIGRATION.md](docs/ELECTRON_MIGRATION.md)** — Why we migrated from Flutter
- **[docs/ELECTRON_SUCCESS_SUMMARY.md](docs/ELECTRON_SUCCESS_SUMMARY.md)** — Migration results
- **[docs/MIGRATION_SUMMARY.md](docs/MIGRATION_SUMMARY.md)** — Executive summary

---

## 🛣️ Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Electron project structure
- [x] **Click-through validated** with `setIgnoreMouseEvents()`
- [x] Timer bubble UI (pure HTML/CSS/JS)
- [x] Basic timer controls
- [x] Global hotkeys
- [x] System tray integration
- [x] Position persistence

### Phase 2: Core Features ✅ COMPLETE!
- [x] Progress ring animation
- [x] Phase icons and state visualization (eye, coffee, star)
- [x] **Full Pomodoro implementation** with visual progress tracking
- [x] **Progress dots** (gray → yellow → green progression)
- [x] **Auto-start controls** (breaks and pomodoros configurable)
- [x] **Reflection period** with blue star after 4 full cycles
- [x] Independent toolbar window
- [x] IPC communication
- [x] **Settings panel** (inline 3-tab: Duration/Options/Notifications)
- [x] **Keyboard navigation** (complete keyboard-driven operation)
- [x] **Visual focus indicators** (glowing outlines for keyboard nav)
- [x] Timer presets (25/5, 50/10)
- [x] Settings persistence (localStorage + IPC)
- [ ] **NEXT:** App icon and packaging

### Phase 3: Polish & Features ⏳ Upcoming
- [ ] SQLite database (sessions, notes, settings)
- [ ] Notes capture with screenshots
- [ ] Session recovery
- [ ] Statistics dashboard
- [ ] Native Rust core integration

### Phase 4: Advanced Features 📋 Future
- [ ] Calendar/Timeline view
- [ ] Task management
- [ ] AI integration (Ollama)
- [ ] E2EE sync server
- [ ] Multi-device support

---

## 📖 Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Click-through | ✅ | Perfect stability |
| Timer Bubble | ✅ | 280×340 rounded square |
| Progress Ring | ✅ | SVG animation |
| Phase Icons | ✅ | Eye, coffee, star ⭐ |
| **Pomodoro Progress** | ✅ | **3-state dots (gray/yellow/green)** |
| **Auto-start Breaks** | ✅ | **Configurable break auto-start** |
| **Auto-start Pomodoros** | ✅ | **Configurable pomodoro auto-start** |
| **Reflection Period** | ✅ | **Blue star after 4 full cycles** |
| **Keyboard Navigation** | ✅ | **Complete keyboard-driven UI** |
| **Visual Focus Indicators** | ✅ | **Glowing outlines for navigation** |
| Toolbar | ✅ | Independent window |
| Global Hotkeys | ✅ | ALT+SHIFT+P/C/S/N |
| System Tray | ✅ | Background operation |
| Position Persist | ✅ | electron-store |
| Settings Panel | ✅ | Swipeable panel |
| Timer Presets | ✅ | 25/5, 50/10 |
| App Icon | 🚧 | Next sprint |
| Notes Panel | ⏳ | Future |
| Screenshot | ⏳ | Future |
| SQLite DB | ⏳ | Future |
| Rust Core (Native) | ⏳ | Future (stub working) |

---

## 🧪 Development

### Flutter Implementation (Archived)
Located in `app/` directory. Preserved for UI reference.

### Electron Implementation (Active)
Will be in `electron-app/` directory (coming soon).

### Rust Core
Located in `core/` directory. **No changes needed** for Electron migration.

---

## 🤝 Contributing

This is currently a solo project in active development. Once the Electron MVP is complete, contribution guidelines will be added.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Rust Pomodoro core inspired by precision timing requirements
- UI design inspired by [Dribbble](https://dribbble.com/)
- Flutter implementation provided invaluable prototyping and UX insights
- Electron provides the stable click-through foundation we need

---

## 💬 Contact

For questions or collaboration: [Open an issue](../../issues)

---

*Last Updated: October 12, 2025*  
*Current Focus: Phase 2 Complete - Auto-Start & Progress Tracking Implemented!*
