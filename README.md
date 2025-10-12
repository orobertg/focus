# Focus App 🎯

> A lightweight, non-intrusive Pomodoro timer with click-through floating UI — built with Electron, React, and Rust for distraction-free focus work.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Status](https://img.shields.io/badge/status-Electron%20Ready-success)]()
[![Click-Through](https://img.shields.io/badge/click--through-Working!-brightgreen)]()

---

## ✅ Electron App - Phase 2 Complete (95%)!

**The migration from Flutter to Electron is SUCCESSFUL and the app is fully functional!**

**Current Status:** Phase 1 (Foundation) ✅ Complete | Phase 2 (Core Features) 🚧 95% Complete

**What Works NOW:**
- ✅ **Click-through functionality** - Perfect stability, no crashes
- ✅ **Beautiful timer UI** - 280×340 rounded square with progress ring
- ✅ **Full Pomodoro Technique** - Complete implementation with progress tracking
- ✅ **Timer controls** - Start, pause, reset all functional
- ✅ **Independent toolbar** - Separate draggable window with IPC communication
- ✅ **Break transitions** - 60-second warm-up and cool-down sequences
- ✅ **Progress tracking** - Green dots show completed pomodoros (0-4)
- ✅ **Reflection periods** - Blue star celebration after 4 pomodoros
- ✅ **Settings panel** - Swipeable configuration interface
- ✅ **Global hotkeys** - ALT+SHIFT+P/C/S/N
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
- ✅ **Global Hotkeys** — ALT+SHIFT+P (toggle), C (click-through), S/N (placeholder)
- ✅ **Position Memory** — Persists across sessions with electron-store
- ✅ **System Tray** — Background running, tray menu
- ✅ **Full Pomodoro Technique** — Progress tracking, break transitions, reflection periods

---

## 🍅 Pomodoro Technique Implementation

Focus App implements the complete **Pomodoro Technique** with visual feedback and gentle transitions to help you maintain deep focus without distraction.

### How It Works

#### **1. Focus Sessions** 🎯
- Work in **25-minute focused intervals** (configurable)
- Open eye icon 👁️ shows you're actively focusing
- Progress ring fills as time elapses
- Each completed session lights up a **green dot** (max 4 per cycle)

#### **2. Break Warm-Up** ⏸️
When you pause the timer:
- Yellow dots fill **left-to-right** every 15 seconds
- Visual countdown: 1 dot (15s) → 2 dots (30s) → 3 dots (45s) → 4 dots (60s)
- After **60 seconds**, automatically transitions to **BREAK** mode
- *This gentle transition encourages you to actually take breaks!*

#### **3. Break Mode** ☕
- Coffee mug icon appears
- All 4 dots turn **yellow and blink**
- Label shows "BREAK"
- Take your well-deserved rest!

#### **4. Break Cool-Down** 🔄
When you resume from break:
- Yellow dots clear **right-to-left** every 15 seconds
- Takes 60 seconds to fully transition back to focus
- Your **green completed-pomodoro dots reappear** underneath
- Smooth re-entry to focus mode

#### **5. Reflection Period** ⭐
After completing **4 consecutive pomodoros**:
- Blue star icon ⭐ appears (celebration!)
- All 4 dots show **solid green**
- Label shows "REFLECT"
- **10-minute minimum** enforced before starting new cycle
- Time to appreciate your productive work!

### Visual Progress Tracking

```
Cycle Progress:
○ ○ ○ ○  →  Start
● ○ ○ ○  →  1 pomodoro complete
● ● ○ ○  →  2 pomodoros complete
● ● ● ○  →  3 pomodoros complete
● ● ● ●  →  4 pomodoros complete → ⭐ REFLECT
```

### Break Transition Example

```
Normal state:        ● ● ○ ○  (2 completed)
Pause for break:     ● ● ○ ○  PAUSE
+15s paused:         🟡● ○ ○  (yellow overlay)
+30s paused:         🟡🟡 ○ ○  
+45s paused:         🟡🟡🟡 ○  
+60s paused:         🟡🟡🟡🟡  BREAK (blinking)
Resume from break:   🟡🟡🟡🟡  FOCUS
+15s resumed:        🟡🟡🟡 ○  
+30s resumed:        🟡🟡 ○ ○  
+45s resumed:        🟡 ● ○ ○  (green restored!)
+60s resumed:        ● ● ○ ○  (back to normal)
```

### Why This Works

1. **Visual Progress** — Green dots show your achievements
2. **Gentle Transitions** — 60-second warm-up/cool-down prevents abrupt context switches
3. **Enforced Breaks** — Auto-transition to break after 60s of pause
4. **Celebration** — Blue star rewards completing 4-pomodoro cycles
5. **Mandatory Rest** — 10-minute reflection prevents burnout

### Configurable Settings

- **Focus duration** (default: 25 min)
- **Short break** (default: 5 min)
- **Long break** (default: 15 min)
- **Pomodoros per cycle** (default: 4)
- **Reflection minimum** (default: 10 min)

📖 **Full Specification:** [docs/Pomodoro_Progress_Dots_Specification.md](docs/Pomodoro_Progress_Dots_Specification.md)

### Flutter Implementation (Archived) 🗃️
- ✅ **All UI components** — Reference for design
- ✅ **Notes Capture** — Quick note-taking with screenshot
- ✅ **SQLite Persistence** — Local database for sessions
- ❌ **Click-Through** — Failed due to platform channel crashes

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

### Phase 2: Core Features 🚧 95% Complete
- [x] Progress ring animation
- [x] Phase icons and state visualization (eye, coffee, star)
- [x] **Full Pomodoro implementation** with progress tracking
- [x] **Green dots** for completed pomodoros (0-4)
- [x] **Break warm-up** (60s yellow dots L→R)
- [x] **Break cool-down** (60s yellow dots R→L)
- [x] **Reflection period** with blue star after 4 pomodoros
- [x] Pause/break dot animations
- [x] Independent toolbar window
- [x] IPC communication
- [x] Settings panel (swipeable)
- [x] Timer presets (25/5, 50/10)
- [ ] **NEXT:** App icon

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
| **Pomodoro Progress** | ✅ | **Green dots track completions** |
| **Break Warm-Up** | ✅ | **60s yellow fill L→R** |
| **Break Cool-Down** | ✅ | **60s yellow clear R→L** |
| **Reflection Period** | ✅ | **Blue star after 4 pomodoros** |
| Dot Animations | ✅ | Pause/break/cooldown |
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

*Last Updated: October 11, 2025*  
*Current Focus: Electron Migration (Click-Through Priority)*
