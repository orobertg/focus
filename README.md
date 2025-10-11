# Focus App 🎯

> A lightweight, non-intrusive Pomodoro timer with click-through floating UI — built with Electron, React, and Rust for distraction-free focus work.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Status](https://img.shields.io/badge/status-Electron%20Ready-success)]()
[![Click-Through](https://img.shields.io/badge/click--through-Working!-brightgreen)]()

---

## ✅ Electron App - Phase 2 Complete (90%)!

**The migration from Flutter to Electron is SUCCESSFUL and the app is functional!**

**Current Status:** Phase 1 (Foundation) ✅ Complete | Phase 2 (Core Features) 🚧 90% Complete

**What Works NOW:**
- ✅ **Click-through functionality** - Perfect stability, no crashes
- ✅ **Beautiful timer UI** - 280×280 rounded square with progress ring
- ✅ **Timer controls** - Start, pause, reset all functional
- ✅ **Independent toolbar** - Separate draggable window with IPC communication
- ✅ **Phase visualization** - Pause/break states with animated yellow dots
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
- ✅ **Pause/Break Visualization** — Animated dots, state transitions

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

### Phase 2: Core Features 🚧 90% Complete
- [x] Progress ring animation
- [x] Phase icons and state visualization
- [x] Pause/break dot animations
- [x] Independent toolbar window
- [x] IPC communication
- [ ] **IN PROGRESS:** Settings panel
- [ ] **IN PROGRESS:** Timer presets
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
| Timer Bubble | ✅ | 280×280 rounded square |
| Progress Ring | ✅ | SVG animation |
| Phase Icons | ✅ | Eye + coffee mug |
| Dot Animations | ✅ | Pause/break/cooldown |
| Toolbar | ✅ | Independent window |
| Global Hotkeys | ✅ | ALT+SHIFT+P/C/S/N |
| System Tray | ✅ | Background operation |
| Position Persist | ✅ | electron-store |
| Settings Panel | 🚧 | Next sprint |
| Timer Presets | 🚧 | Next sprint |
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
