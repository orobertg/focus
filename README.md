# Focus 🎯

> A lightweight, non-intrusive Pomodoro timer with click-through floating UI — perfect for distraction-free focus work.

[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Electron](https://img.shields.io/badge/electron-38.2.2-blue)]()

---

## ✨ What Makes Focus Special?

**Focus** is a Pomodoro timer that stays visible but never gets in your way. The unique **click-through** feature lets you interact with apps behind the timer while keeping track of your productivity.

### Key Features

- 🪟 **Click-Through Mode** — Click through the timer to apps behind it
- ⏱️ **Pomodoro Technique** — 25-min focus sessions with automatic breaks
- 🎨 **Beautiful UI** — Minimal, elegant timer with progress visualization
- 🔔 **Smart Notifications** — Sound alerts + desktop notifications
- ⌨️ **Global Hotkeys** — Control from anywhere (ALT+SHIFT+P/C/O)
- 💾 **Auto-Save Settings** — Remembers position, duration, preferences
- 🎯 **Timer Presets** — Quick 25/5 or 50/10 timers
- ⚙️ **Fully Customizable** — Adjust work/break durations, sounds, behavior

---

## 📥 Download & Installation

### Windows

**Download the latest release:** [v0.1.0](https://github.com/YOUR_USERNAME/focus_app/releases/tag/v0.1.0)

**Choose your version:**
- **Focus-0.1.0-Setup.exe** (91 MB) — Full installer with shortcuts
  - Double-click to install
  - Creates desktop and Start Menu shortcuts
  - Includes clean uninstaller
  
- **Focus-0.1.0-Portable.exe** (91 MB) — No installation required
  - Run directly from any folder
  - Perfect for USB drives
  - Settings saved in AppData

### macOS

**Coming Soon!** 🍎

macOS builds require a Mac to compile. Options:
- Build locally on your Mac (see [Development](#-development))
- Wait for automated builds via GitHub Actions (coming soon)

---

## 🚀 Quick Start

### First Launch

1. **Install/Run Focus** using one of the installers above
2. **Timer appears** at the last saved position (or center of screen)
3. **Toolbar appears** with controls
4. **System tray icon** shows in taskbar

### Basic Usage

1. **Start timer:** Click ▶ play button or press ALT+SHIFT+P
2. **Pause timer:** Click ⏸ pause button
3. **Reset timer:** Click ■ stop button
4. **Extend session:** Click "+5" to add 5 minutes
5. **Quick preset:** Click "25/5" or "50/10" for instant setup

### Settings

**Open settings:** Click ⚙ gear icon or press **ALT+SHIFT+O**

**Three tabs:**
- **DURATION** — Adjust work/break times with sliders
- **OPTIONS** — Auto-start breaks/pomodoros, always-on-top
- **NOTIFICATIONS** — Enable/disable sounds and desktop alerts

### Global Hotkeys

- **ALT+SHIFT+P** — Show/hide windows
- **ALT+SHIFT+C** — Toggle click-through mode
- **ALT+SHIFT+O** — Open settings

### Click-Through Mode

**What is it?**  
Click-through mode makes the timer "transparent" to mouse clicks, letting you interact with windows behind it.

**How to use:**
1. Press **ALT+SHIFT+C** to enable
2. Timer stays visible but you can click through it
3. Press **ALT+SHIFT+C** again to disable

**Perfect for:**
- Keeping timer visible while coding
- Monitoring time during video calls
- Staying focused during research/reading

---

## 🎯 How It Works

### The Pomodoro Technique

Focus implements the classic Pomodoro Technique:

1. **Work Session** (25 min default) — Focus on a single task
2. **Short Break** (5 min) — Relax, stretch, hydrate
3. **Repeat 4 times** — Build momentum with breaks
4. **Long Break** (15 min) — Longer rest after 4 cycles
5. **Reflection** — Review your accomplishments

### Visual Progress

- **Progress Ring** — Circular timer shows remaining time
- **Progress Dots** — Track completed Pomodoros (4 dots)
  - Gray = Not started
  - Yellow = Break in progress
  - Green = Completed
- **Phase Icons** — Eye (focus) or Coffee (break)
- **Celebration** — Blue star when all 4 cycles complete

---

## ⚙️ Settings & Customization

### Timer Durations
- **Work Session:** 1-120 minutes (default: 25)
- **Short Break:** 1-30 minutes (default: 5)
- **Long Break:** 5-60 minutes (default: 15)
- **Cycle Length:** 1-10 Pomodoros (default: 4)

### Behavior Options
- **Auto-start Breaks** — Automatically start break timer after work
- **Auto-start Pomodoros** — Automatically start next work session after break
- **Always on Top** — Keep timer above all windows (default: off)

### Notifications
- **Sound Notifications** — Pleasant audio tones for phase transitions
  - Test sound button included
  - Work complete: 880 Hz (A5 note)
  - Break complete: 659 Hz (E5 note)
  - Long break: Two-tone sequence
- **Desktop Notifications** — Windows toast notifications
  - "Focus Session Complete! Time for a break."
  - "Break Complete! Ready to get back to work?"
  - "All 4 Pomodoros Complete! Time to reflect!"

---

## 🛠️ Development

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Windows** for Windows builds
- **macOS** for macOS builds

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/focus_app.git
cd focus_app/electron-app

# Install dependencies
npm install

# Run in development mode (with DevTools)
npm start

# Run in production mode (no DevTools)
npm run start:prod
```

### Building

```bash
# Build Windows installer + portable
npm run build:win

# Build macOS installers (requires macOS)
npm run build:mac

# Build both platforms
npm run build:all
```

**Output:** `electron-app/dist/`

### Project Structure

```
focus_app/
├── electron-app/           # Main application
│   ├── main.js            # Electron main process
│   ├── renderer.js        # Timer logic & UI
│   ├── toolbar.js         # Toolbar window
│   ├── index.html         # Timer window
│   ├── toolbar.html       # Toolbar window
│   ├── styles.css         # Styling
│   ├── core_stub.js       # Timer engine (JS)
│   ├── assets/            # Icons and resources
│   └── package.json       # Dependencies & build config
├── docs/                  # Documentation
└── README.md             # This file
```

---

## 🐛 Troubleshooting

### Windows

**Timer not visible**
- Press **ALT+SHIFT+P** to toggle visibility
- Check system tray → Right-click Focus icon → "Show/Hide"

**Multiple instances running**
- Only one Focus instance can run at a time
- Close all instances: Task Manager → End "Focus.exe" processes
- Restart the app

**Settings not saving**
- Settings are stored in: `%APPDATA%\focus\config.json`
- If issues persist, delete this file and restart

**Click-through not working**
- Press **ALT+SHIFT+C** to toggle
- Restart the app if issue persists

### macOS

**"App can't be opened" security warning**
1. Right-click on Focus.app
2. Select "Open"
3. Click "Open" in the security dialog
4. Only needed once, future launches work normally

---

## 📝 Changelog

### v0.1.0 (October 13, 2025) - Initial Release

**Core Features:**
- ✅ Full Pomodoro timer implementation
- ✅ Click-through window functionality
- ✅ Beautiful timer UI with progress visualization
- ✅ Independent draggable toolbar
- ✅ Settings panel with 3 tabs
- ✅ Timer presets (25/5, 50/10)
- ✅ Extend +5 button

**Notifications:**
- ✅ Sound notifications (Web Audio API)
- ✅ Desktop notifications (Windows toasts)
- ✅ Test sound button in settings

**System Integration:**
- ✅ Global hotkeys (ALT+SHIFT+P/C/O)
- ✅ System tray icon
- ✅ Position persistence
- ✅ Single instance enforcement

**Distribution:**
- ✅ Windows NSIS installer
- ✅ Windows portable executable
- ✅ Auto-save settings
- ✅ Clean uninstaller

**Known Limitations:**
- macOS builds require Mac hardware
- Linux builds not yet tested

---

## 🗺️ Roadmap

### Future Features (Not in v0.1.0)

**Database & History**
- [ ] SQLite session tracking
- [ ] Statistics dashboard
- [ ] Focus time analytics
- [ ] Session recovery after restart

**Native Performance**
- [ ] Rust core integration (neon-bindings)
- [ ] Monotonic clock for accuracy
- [ ] Reduced CPU usage

**Advanced Features**
- [ ] Notes capture with screenshots
- [ ] Multiple timer profiles
- [ ] Custom themes (dark/light)
- [ ] Auto-start on system boot

**Distribution**
- [ ] macOS code signing
- [ ] Microsoft Store distribution
- [ ] Mac App Store distribution
- [ ] Auto-update mechanism

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** — Open an issue with reproduction steps
2. **Suggest features** — Share your ideas in discussions
3. **Submit PRs** — Fork, create a branch, and submit a pull request
4. **Improve docs** — Help make documentation clearer
5. **Test on macOS/Linux** — Share your experience

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Technologies Used
- **Electron** — Cross-platform desktop framework
- **electron-builder** — Distribution packaging
- **electron-store** — Settings persistence
- **Web Audio API** — Sound notifications
- **HTML5 Notifications** — Desktop alerts

### Inspiration
- **Pomodoro Technique** by Francesco Cirillo
- **Flow Timer** and similar minimal timer apps
- Community feedback and feature requests

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/focus_app/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/focus_app/discussions)
- **Email:** focus@example.com (replace with your email)

---

## ⭐ Star This Project

If you find Focus useful, please consider:
- ⭐ Starring the repository
- 📢 Sharing with friends and colleagues
- 💬 Leaving feedback in discussions
- 🐛 Reporting bugs to help improve the app

---

**Built with focus, for focus.** 🎯

**Version:** 0.1.0  
**Last Updated:** October 13, 2025  
**Status:** Production Ready
