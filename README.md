# Focus App 🎯

> A lightweight, floating Pomodoro timer with precision Rust timing and elegant Flutter UI — designed for distraction-free focus work.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Status](https://img.shields.io/badge/status-MVP%20in%20progress-yellow)]()

---

## ✨ Features

### Current (MVP Phase 1) ✅
- **Floating Timer Bubble** — Always-on-top, draggable circular timer with progress ring
- **Precision Timing** — Rust-powered Pomodoro engine with monotonic clock and drift correction
- **Pomodoro Presets** — Quick-start with 25/5, 50/10 configurations
- **Mini Toolbar** — Detachable control panel with preset buttons
- **Global Hotkeys** — System-wide shortcuts (ALT+SHIFT+P, ALT+SHIFT+S, ALT+SHIFT+N)
- **Notes Capture** — Quick note-taking with screenshot attachment support
- **Position Memory** — Remembers bubble and toolbar positions across sessions
- **SQLite Persistence** — Local-first storage with session recovery

### Planned (Phase 2) 🚧
- Calendar & Task Management with drag-drop scheduling
- Stats, streaks, and productivity insights
- E2EE sync server for multi-device support
- AI-powered summaries (Ollama local, OpenAI/Anthropic cloud)
- Mobile apps (iOS/Android)

---

## 🎯 Design Philosophy

**Non-intrusive** — Stays out of your way with minimal UI footprint  
**Local-first** — Your data lives on your machine; optional sync later  
**Precision-focused** — Rust core ensures accurate timing, even through sleep/wake  
**Keyboard-driven** — Full hotkey support for power users  
**Beautiful & Minimal** — Clean design inspired by modern productivity tools

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Flutter UI (Material 3)         │
│  • Draggable bubbles & toolbar          │
│  • Notes widget, screenshot capture     │
│  • System tray integration              │
└──────────────┬──────────────────────────┘
               │ FFI Bridge
               │ (flutter_rust_bridge)
┌──────────────┴──────────────────────────┐
│          Rust Core (focus_core)         │
│  • Pomodoro state machine               │
│  • Monotonic timing (std::time)         │
│  • Sleep/wake drift correction          │
└─────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│     SQLite Persistence Layer            │
│  • Session state & history              │
│  • Notes with attachments               │
│  • User preferences                     │
└─────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Flutter** 3.0+ with desktop support enabled
- **Rust** stable toolchain (1.70+)
- **Cargo** package manager

#### Enable Flutter Desktop Support
```bash
# Windows
flutter config --enable-windows-desktop

# macOS
flutter config --enable-macos-desktop

# Linux
flutter config --enable-linux-desktop
```

#### Enable Windows Developer Mode (Windows only)
Required for symlink support during build:
```powershell
start ms-settings:developers
```

---

### Installation & Running

#### Option 1: Run with Stub Engine (Quick Test)
```bash
cd app
flutter pub get
flutter run -d windows  # or macos, linux
```

#### Option 2: Build with Rust Core (Full Features)

1. **Build the Rust core**
   ```bash
   cd core
   cargo build --release
   ```

2. **Copy DLL to Flutter runner** (Windows example)
   ```bash
   # Windows
   copy target\release\focus_core.dll ..\app\windows\runner\

   # macOS
   cp target/release/libfocus_core.dylib ../app/macos/Runner/

   # Linux
   cp target/release/libfocus_core.so ../app/linux/flutter/
   ```

3. **Run the app**
   ```bash
   cd ../app
   flutter pub get
   flutter run -d windows
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `ALT+SHIFT+P` | Toggle window visibility |
| `ALT+SHIFT+S` | Quick screenshot capture |
| `ALT+SHIFT+N` | Toggle notes panel |

**In-app controls:**
- **Click timer** → Play/Pause
- **Restart button** (bottom-left) → Reset current session
- **Settings button** (bottom-right) → Configure durations
- **Drag timer/toolbar** → Reposition anywhere on screen

---

## 📁 Project Structure

```
focus_app/
├── app/                    # Flutter application
│   ├── lib/
│   │   ├── main.dart      # Main UI & state management
│   │   ├── stub_engine.dart   # Development stub (optional)
│   │   ├── database_service.dart  # SQLite persistence
│   │   ├── notes_service.dart     # Notes & screenshots
│   │   └── notes_widget.dart      # Notes UI
│   ├── windows/           # Windows desktop runner
│   └── pubspec.yaml       # Flutter dependencies
│
├── core/                   # Rust Pomodoro engine
│   ├── src/
│   │   └── lib.rs         # Timer state machine & FFI API
│   └── Cargo.toml         # Rust dependencies
│
├── server/                 # Optional sync server (Phase 2)
│   └── src/main.rs        # Axum REST API skeleton
│
├── Specifications.md       # Product & technical specs
├── MVP_Milestone_Plan.md   # Development roadmap
└── README.md              # This file
```

---

## 🛠️ Development

### Generating FFI Bindings (Advanced)

If modifying the Rust ↔ Flutter interface:

1. **Install codegen tool**
   ```bash
   cargo install --locked flutter_rust_bridge_codegen
   ```

2. **Regenerate bindings**
   ```bash
   flutter_rust_bridge_codegen generate \
     --rust-input crate \
     --rust-root core \
     --dart-output app/lib/ffi/ \
     --c-output app/ios/Runner/bridge_generated.h \
     --class-name FocusCore
   ```

3. **Rebuild Rust core**
   ```bash
   cd core
   cargo build --release
   ```

---

## 📊 Current Status (MVP Phase 1)

| Component | Status | Notes |
|-----------|--------|-------|
| Rust Core Engine | ✅ Complete | Monotonic timing, state machine, auto-advance |
| Flutter UI | ✅ Complete | Draggable bubble, toolbar, modern design |
| Global Hotkeys | ✅ Complete | System-wide shortcuts working |
| Position Persistence | ✅ Complete | Remembers window positions |
| SQLite Persistence | ✅ Complete | Session state & recovery |
| Notes Capture | ✅ Complete | Quick notes with screenshot support |
| System Tray | 🚧 In Progress | Icon and menu implemented, needs refinement |
| Unit Tests | ⏳ Pending | Phase transitions, drift correction |
| Rust Core FFI | ⏳ Pending | Needs integration (currently using stub) |

---

## 🎨 Design Inspiration

The UI draws inspiration from modern productivity tools with a focus on:
- **Minimal visual clutter** — Only essential information visible
- **Smooth animations** — Subtle progress indicators and transitions
- **Adaptive theming** — Dark mode optimized for focus sessions
- **Spatial consistency** — Consistent button placement and iconography

---

## 🧪 Testing

### Run Flutter Tests
```bash
cd app
flutter test
```

### Run Rust Tests
```bash
cd core
cargo test
```

### Manual Testing Checklist
See `TESTING_CHECKLIST.md` for comprehensive manual testing procedures.

---

## 🤝 Contributing

This is currently a personal project in active development. Contributions, bug reports, and feature requests are welcome!

### Development Workflow
1. Check `MVP_Milestone_Plan.md` for current priorities
2. Follow the architecture in `Specifications.md`
3. Test on Windows primarily (macOS/Linux compatibility maintained)
4. Keep UI minimal and non-intrusive
5. Ensure Rust core remains authoritative for timing

---

## 📝 License

MIT License — See `LICENSE` file for details.

---

## 🙏 Acknowledgments

- **Flutter** — Beautiful cross-platform UI framework
- **Rust** — Rock-solid systems programming and timing precision
- **flutter_rust_bridge** — Seamless FFI integration
- Design inspiration from Dribbble community

---

## 📮 Contact & Support

For questions, bug reports, or feature requests:
- Open an issue on the repository
- Check `Specifications.md` for detailed technical documentation
- Review `MVP_Milestone_Plan.md` for upcoming features

---

**Made with ⏱️ for focused, productive work.**
