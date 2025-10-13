# Changelog

All notable changes to Focus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-10-13

### 🎉 Initial Release

First production-ready release of Focus - a non-intrusive Pomodoro timer with click-through functionality.

### Added

#### Core Functionality
- **Pomodoro Timer** - Full implementation of the Pomodoro Technique
  - 25-minute focus sessions (configurable 1-120 min)
  - 5-minute short breaks (configurable 1-30 min)
  - 15-minute long breaks after 4 cycles (configurable 5-60 min)
  - Visual progress tracking with dots (gray → yellow → green)
  - Reflection period after completing 4 full cycles

#### User Interface
- **Click-Through Window** - Unique feature allowing clicks to pass through timer
- **Timer Bubble** - Beautiful 280×340px floating timer
  - Circular progress ring with smooth animations
  - Phase icons (eye for focus, coffee for break)
  - Timer display (MM:SS format)
  - Bottom controls (Reset, Start/Pause, Settings)
- **Independent Toolbar** - Separate draggable window
  - Play/Pause button
  - Stop/Reset button
  - Extend +5 button
  - Timer presets (25/5, 50/10)
  - Settings button
  - Notes button (placeholder)
- **Settings Panel** - Inline 3-tab interface
  - Duration tab: Adjust all timer durations with sliders
  - Options tab: Auto-start controls, always-on-top toggle
  - Notifications tab: Sound and desktop notification toggles

#### Notifications
- **Sound Notifications** - Pleasant audio tones using Web Audio API
  - Work complete: 880 Hz (A5 note), 0.3s
  - Short break complete: 659 Hz (E5 note), 0.25s
  - Long break complete: Two-tone sequence (698 Hz + 880 Hz)
  - Test sound button in settings
  - Volume: 30% (moderate, non-startling)
- **Desktop Notifications** - Windows toast notifications
  - "🎯 Focus Session Complete! Great work! Time for a break."
  - "☕ Break Complete! Ready to get back to work?"
  - "☕ Long Break Complete! Feeling refreshed?"
  - "🌟 All 4 Pomodoros Complete! Time to reflect!"
  - Auto-dismiss after 5 seconds

#### System Integration
- **Global Hotkeys** - Control from anywhere
  - ALT+SHIFT+P: Toggle window visibility
  - ALT+SHIFT+C: Toggle click-through mode
  - ALT+SHIFT+O: Open settings
- **System Tray** - Background operation support
  - Icon appears in Windows taskbar
  - Right-click context menu (Show/Hide, Reset Position, Quit)
  - Double-click to toggle visibility
- **Position Persistence** - Windows remember their locations
  - Timer position saved on move
  - Toolbar position saved independently
  - Restored on app restart
- **Single Instance Lock** - Only one Focus can run at a time
  - Prevents multiple instances
  - Shows clear warning if attempted
  - Focuses existing window when re-launched

#### Settings & Customization
- **Timer Presets** - Quick setup buttons
  - 25/5 (Classic Pomodoro)
  - 50/10 (Extended Focus)
  - Instantly applies new durations
- **Extend +5 Button** - Add 5 minutes to current session
  - Works during work or break phases
  - Updates progress ring accordingly
- **Auto-Start Controls**
  - Auto-start breaks (optional)
  - Auto-start pomodoros (optional)
  - Independent toggles for flexibility
- **Always on Top** - Optional window behavior
  - Keep timer above all windows
  - Toggle in settings
  - Applies to both timer and toolbar

#### Distribution
- **Windows NSIS Installer** (91 MB)
  - Full installation wizard
  - Desktop shortcut option
  - Start Menu shortcut
  - Clean uninstaller
  - Customizable install location
- **Windows Portable Executable** (91 MB)
  - No installation required
  - Run from any folder
  - Perfect for USB drives
  - Settings stored in AppData

### Technical Details

#### Architecture
- **Electron 38.2.2** - Cross-platform desktop framework
- **Node.js 18+** - Runtime environment
- **HTML5 + CSS3** - User interface
- **JavaScript** - Application logic
- **electron-store 8.2.0** - Settings persistence
- **electron-localshortcut 3.2.1** - Global hotkeys
- **electron-builder 26.0.12** - Distribution packaging

#### Performance
- **Timer Accuracy** - 250ms tick rate (4 ticks per second)
- **Memory Usage** - ~90-100 MB (typical for Electron app)
- **CPU Usage** - Minimal (< 1% when idle)
- **Startup Time** - ~1-2 seconds

#### Development
- **Development Mode** - DevTools open with `--dev` flag
- **Production Mode** - Clean launch without DevTools
- **Build Scripts** - npm commands for packaging
- **Code Structure** - Well-organized with comments

### Fixed

- **DevTools Auto-Open** - No longer opens in production builds
- **Multiple Instances** - Properly enforced single instance
- **electron-store Compatibility** - Works without warnings
- **Window Flickering** - Debounced always-on-top re-assertion

### Known Issues

- **macOS Build** - Requires Mac hardware to build
  - Windows can't cross-compile to macOS
  - Solution: Use GitHub Actions or build on Mac
- **Linux** - Not yet tested
  - Should work but not officially supported
- **Antivirus False Positives** - Some AVs may flag unsigned .exe
  - Use installer version for better trust
  - Or whitelist the application

### Limitations

- **Unsigned Binaries** - No code signing certificate yet
  - Windows SmartScreen may show warning
  - macOS will require right-click → Open workaround
  - Future: Get signing certificates
- **No Auto-Update** - Manual download required for updates
  - Future: Implement auto-update mechanism
- **Windows Only (Official)** - macOS/Linux builds not provided
  - Can be built locally on those platforms

---

## [Unreleased]

### Planned Features

#### v0.2.0 (Database & History)
- SQLite database integration
- Session history tracking
- Statistics dashboard
- Focus time analytics
- Session recovery after restart

#### v0.3.0 (Native Performance)
- Rust core integration (neon-bindings)
- Monotonic clock for better accuracy
- Reduced CPU usage
- Better battery efficiency

#### v0.4.0 (Advanced Features)
- Notes capture with screenshots
- Multiple timer profiles
- Custom themes (dark/light)
- Keyboard shortcuts (Space, Escape)
- Auto-start on system boot

#### v1.0.0 (Production Polish)
- Code signing (Windows & macOS)
- Auto-update mechanism
- Microsoft Store distribution
- Mac App Store distribution
- Linux package managers (Snap, AppImage)

---

## Version History

- **0.1.0** (2025-10-13) - Initial Release

---

**Note:** Dates are in YYYY-MM-DD format (ISO 8601).

