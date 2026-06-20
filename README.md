# Focus

> A lightweight, non-intrusive Pomodoro timer with click-through floating UI — perfect for distraction-free focus work.

[![Version](https://img.shields.io/badge/version-0.2.0-blue)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Electron](https://img.shields.io/badge/electron-38.2.2-blue)]()

---

## What Makes Focus Special?

**Focus** is a Pomodoro timer that stays visible but never gets in your way. Work with your apps and run the timer while keeping track of your productivity using just the keyboard. Simple and unobtrusive.

### Key Features

- **Click-Through Mode** — Click through the timer to apps behind it
- **Pomodoro Technique** — 25-min focus sessions with automatic breaks
- **Session History** — SQLite-backed tracking of every focus session
- **Stats Dashboard** — Today's focus time, streak, and 7-day chart
- **Session Recovery** — Detects unfinished sessions after a crash
- **Smart Notifications** — Sound alerts + desktop notifications
- **Global Hotkeys** — Control from anywhere (ALT+SHIFT+P/C/O)
- **Auto-Save Settings** — Remembers position, duration, preferences
- **Timer Presets** — Quick 25/5 or 50/10 timers
- **Fully Customizable** — Adjust work/break durations, sounds, behavior

---

## Platform Support

| Platform | Status | Formats Available |
|----------|--------|-------------------|
| **Windows** | Available | Installer (NSIS), Portable EXE |
| **Linux** | Available | AppImage, DEB, RPM |
| **macOS** | Available | DMG, ZIP (Intel & Apple Silicon) |

---

## Download & Installation

**[Download Latest Release](https://github.com/orobertg/focus/releases/latest)**

### Windows

- **Focus-0.2.0-Setup.exe** — Full installer with shortcuts and uninstaller
- **Focus-0.2.0-Portable.exe** — No installation required; run from any folder

### Linux

- **Focus-0.2.0-x86_64.AppImage** — Portable, works on most distros
  ```bash
  chmod +x Focus-0.2.0-x86_64.AppImage
  ./Focus-0.2.0-x86_64.AppImage
  ```
- **Focus-0.2.0-amd64.deb** — Debian/Ubuntu: `sudo dpkg -i Focus-0.2.0-amd64.deb`
- **Focus-0.2.0-x86_64.rpm** — Fedora/RedHat: `sudo rpm -i Focus-0.2.0-x86_64.rpm`

### macOS

- **Focus-0.2.0-x64.dmg** — Intel Macs
- **Focus-0.2.0-arm64.dmg** — Apple Silicon (M1/M2/M3)

Apps are unsigned. On first launch: right-click → Open → Open. Only needed once.

---

## Quick Start

1. Install/run Focus using one of the installers above
2. Timer appears at last saved position (or center of screen)
3. Toolbar appears with controls
4. System tray icon appears in taskbar

**To quit:** right-click the system tray icon → "Quit Focus App". Closing the window only hides it.

### Basic Controls

| Action | How |
|--------|-----|
| Start/pause | Click play button on toolbar |
| Reset | Click stop button on toolbar |
| Extend +5 min | Click "+5" on toolbar |
| Quick preset | Click "25/5" or "50/10" on toolbar |
| Toggle visibility | ALT+SHIFT+P |
| Toggle click-through | ALT+SHIFT+C |
| Open settings | ALT+SHIFT+O or click gear icon |

### Settings Tabs

- **DURATION** — Adjust work/break times
- **OPTIONS** — Auto-start breaks/pomodoros, always-on-top
- **ALERTS** — Sound and desktop notification toggles
- **STATS** — Today's focus time, streak, 7-day bar chart

---

## How It Works

### Pomodoro Flow

1. **Work session** (25 min default) — Focus on a single task
2. **Short break** (5 min) — Relax, stretch, hydrate
3. Repeat 4 times
4. **Long break** (15 min) — Longer rest after 4 cycles
5. **Reflection period** — Mandatory 10-minute review before starting again

### Visual Progress

- **Progress ring** — Shows time remaining as a circular stroke
- **Progress dots** — 4 dots per cycle: gray → yellow (break in progress) → green (complete)
- **Phase icons** — Eye (focus), coffee mug (break), star (reflection complete)

### Stats & History (v0.2.0)

Focus now records every session to a local SQLite database at:
- Windows: `%APPDATA%\Focus\focus.db`
- macOS: `~/Library/Application Support/Focus/focus.db`
- Linux: `~/.config/Focus/focus.db`

The **STATS** tab in settings shows:
- Today's total focus time and pomodoro count
- Current daily streak
- 7-day bar chart (today = red, prior days = amber)

If Focus exits mid-session (crash or force-quit), it will prompt on next startup to keep the partial session as completed or discard it.

---

## Development

### Prerequisites

- Node.js 18+ (LTS)
- npm
- Platform tools for native modules: `npm run rebuild` handles this automatically

### Setup

```bash
git clone https://github.com/orobertg/focus.git
cd focus/electron-app
npm install        # installs deps and rebuilds better-sqlite3 for Electron
npm start          # dev mode (DevTools open)
npm run start:prod # production mode
```

### Building

```bash
npm run build:win    # Windows installer + portable
npm run build:mac    # macOS DMG + ZIP (requires macOS)
npm run build:linux  # AppImage + deb + rpm (requires Linux or WSL)
```

Output goes to `electron-app/dist/`.

GitHub Actions builds all platforms automatically on push to `main`.

### Project Structure

```
focus_app/
├── electron-app/
│   ├── main.js        — Main process (windows, IPC, tray, DB init)
│   ├── db.js          — SQLite module (schema, sessions, stats)
│   ├── core_stub.js   — Timer engine (JS; Rust integration planned)
│   ├── renderer.js    — Timer logic, session recording, stats UI
│   ├── index.html     — Timer bubble + inline settings panel
│   ├── styles.css     — All UI styles
│   ├── toolbar.*      — Independent toolbar window
│   ├── assets/icons/  — App icons
│   └── package.json
└── docs/              — Specifications, milestones, session notes
```

---

## Troubleshooting

### Timer not visible
Press **ALT+SHIFT+P** or right-click the tray icon → Show/Hide.

### Windows SmartScreen warning
App is unsigned. Click "More info" → "Run anyway". Code is open source.

### macOS security warning
Right-click → Open → Open. Only required on first launch.

### Linux: AppImage won't run
```bash
chmod +x Focus-*.AppImage
sudo apt install fuse libfuse2  # Ubuntu/Debian if FUSE is missing
```

### Linux: system tray icon missing (GNOME)
```bash
sudo apt install gnome-shell-extension-appindicator
```
Then enable the extension in the GNOME Extensions app.

### Linux: hotkeys not working
Hotkeys work best on X11. On Wayland, compositor restrictions may apply.

### Settings not saving
Settings are stored in electron-store. Config location:
- Windows: `%APPDATA%\focus\config.json`
- Linux: `~/.config/focus/config.json`

### Multiple instances
Only one instance runs at a time. If you see the "already running" dialog, right-click the tray → Quit, then restart.

---

## Changelog

### v0.2.0 (May 11, 2026) — Session History & Stats

- Added SQLite session history (`better-sqlite3`, WAL mode, schema migrations)
- Session recovery on startup: detects crash-interrupted sessions and prompts to keep or discard
- Stats tab in settings panel: today's focus time, pomodoro count, streak, 7-day bar chart
- Session lifecycle instrumentation: every work/break start, completion, and reset is recorded
- Added `@electron/rebuild` + `postinstall` script for native module compatibility

### v0.1.6 (October 2025) — Build Fix

- CI/release pipeline fixes

### v0.1.5 (October 2025) — System Tray Fix & Cross-Platform

- Fixed system tray icon not appearing in packaged Windows builds
- Reflection period countdown timer and Knight Rider dot animation
- GitHub Actions automated builds for Windows, Linux, macOS

### v0.1.0 (October 2025) — Initial Release

- Full Pomodoro timer with click-through window
- Independent draggable toolbar
- Settings panel (Duration / Options / Notifications)
- Timer presets (25/5, 50/10), Extend +5
- Sound notifications (Web Audio API) and desktop toasts
- Global hotkeys, system tray, position persistence, single instance lock
- Windows installer + portable; Linux AppImage/deb/rpm; macOS DMG

---

## Roadmap

- **v0.3.0** — Rust core via neon-bindings (replace JS timer stub)
- **v0.4.0** — Notes capture with screenshot attach, themes, keyboard shortcuts
- **v1.0.0** — Code signing, auto-update, Microsoft/Mac App Store

---

## Contributing

1. Report bugs — open an issue with reproduction steps
2. Suggest features — share ideas in discussions
3. Submit PRs — fork, branch, and pull request
4. Test on Linux — various distros and desktop environments welcome

---

## License

MIT — see [LICENSE](LICENSE).

---

**Built with focus, for focus.**

**Version:** 0.2.0 | **Last Updated:** May 11, 2026
