# Focus - Current Status

**Date:** May 11, 2026
**Version:** 0.2.0
**Branch:** main

---

## Progress Summary

### v0.2.0 — Session History & Stats: ✅ COMPLETE

SQLite database integration, session recovery, and stats dashboard shipped.

---

## What's Working

### Core Timer
- ✅ **Click-through** — Works reliably via `setIgnoreMouseEvents`
- ✅ **Pomodoro engine** — Start, pause, resume, reset, extend +5
- ✅ **Phase management** — FOCUS → BREAK → LONG BREAK → REFLECT
- ✅ **Accurate timing** — 250ms tick rate (JavaScript stub; Rust integration is future)
- ✅ **Pause-break system** — Warm-up → blinking → cool-down dot animations
- ✅ **Reflection period** — After 4 full cycles, enforced 10-min break with animation

### UI / UX
- ✅ **Timer bubble** — 280×340px floating window, rounded corners
- ✅ **Progress ring** — Animated SVG stroke
- ✅ **Phase icons** — Eye (focus), coffee mug (break), star (reflect)
- ✅ **Progress dots** — Gray → yellow → green lifecycle per pomodoro
- ✅ **Independent toolbar** — Separate draggable window with play/pause, stop, +5, presets, notes, settings
- ✅ **Settings panel** — Inline 4-tab interface (Duration / Options / Alerts / Stats)
- ✅ **Edge snap / collapse** — Window snaps to screen edges and collapses to a handle

### System Integration
- ✅ **Global hotkeys** — ALT+SHIFT+P (visibility), C (click-through), O (settings)
- ✅ **System tray** — Icon, context menu, double-click show/hide
- ✅ **Position persistence** — Both windows remember last position via electron-store
- ✅ **Single instance lock** — Prevents duplicate processes
- ✅ **Sound notifications** — Web Audio API tones for each phase transition
- ✅ **Desktop notifications** — Windows toast with auto-dismiss

### v0.2.0 — Database & History (NEW)
- ✅ **SQLite database** — `better-sqlite3` at `%APPDATA%\Focus\focus.db`
- ✅ **Session recording** — Every work/break session written with start time, planned ms, actual ms, phase, status
- ✅ **Session recovery** — On startup, detects any crash-interrupted `active` row; prompts Keep-as-completed or Discard
- ✅ **Stats dashboard** — STATS tab in settings panel:
  - Today's focus time (e.g. "1h 45m") and pomodoro count
  - Current streak (consecutive days with ≥1 completed work session)
  - 7-day bar chart (today = red, prior days = amber, zero days = dim)
- ✅ **Schema migrations** — `schema_meta` table tracks version; safe to add future migrations

### Distribution
- ✅ **Windows installer** — NSIS setup wizard
- ✅ **Windows portable** — Single .exe, no install required
- ✅ **macOS** — DMG + ZIP (Intel & Apple Silicon; built via GitHub Actions)
- ✅ **Linux** — AppImage, DEB, RPM

---

## Pending / Future Work

### v0.3.0 — Native Performance
- [ ] Replace `core_stub.js` with Rust core via `neon-bindings`
- [ ] Monotonic clock + sleep/wake drift correction
- [ ] Reduced CPU/battery usage

### v0.4.0 — Quality of Life
- [ ] Notes capture with screenshot attach (ALT+SHIFT+N/S stubs already bound)
- [ ] Multiple timer profiles
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts (Space = play/pause, Escape = reset)
- [ ] Auto-start on system boot

### v1.0.0 — Distribution Polish
- [ ] Code signing (Windows + macOS)
- [ ] Auto-update mechanism (electron-updater)
- [ ] Microsoft Store / Mac App Store distribution

### Longer-term (Specs Phase 2/3)
- [ ] Tasks + Kanban + Timeline panels
- [ ] AI integration (Ollama → OpenAI → Anthropic)
- [ ] E2EE sync server (multi-device)
- [ ] Mobile clients
- [ ] CSV/JSON export for sessions/stats

---

## Project Structure

```
focus_app/
├── electron-app/
│   ├── main.js           ← Main process (IPC, tray, windows, DB init)
│   ├── db.js             ← SQLite module (better-sqlite3, migrations, stats)
│   ├── core_stub.js      ← Timer engine (JS stub — Rust integration TBD)
│   ├── index.html        ← Timer bubble + settings panel (4 tabs)
│   ├── styles.css        ← All UI styles
│   ├── renderer.js       ← Timer logic, session lifecycle recording, stats render
│   ├── toolbar.html/css/js ← Independent toolbar window
│   ├── settings.html/css/js ← Legacy (superseded by inline panel)
│   ├── assets/icons/     ← App icons at multiple sizes
│   └── package.json      ← v0.2.0
│
├── docs/
│   ├── Specifications.md         ← Full product & technical spec
│   ├── MVP_Milestone_Plan.md     ← Original Electron migration plan
│   ├── milestones/               ← Per-sprint detail docs
│   ├── CURRENT_STATUS.md         ← This file
│   └── SESSION_SUMMARY_2026-05-11.md ← v0.2.0 session notes
│
├── README.md
└── CHANGELOG.md
```

---

## Quick Start

```bash
cd electron-app
npm install          # also runs electron-rebuild for better-sqlite3
npm start            # dev mode (DevTools open)
npm run start:prod   # production mode
npm run build:win    # build Windows installer + portable
```

**Hotkeys:**
- `ALT+SHIFT+P` — Show/hide timer
- `ALT+SHIFT+C` — Toggle click-through
- `ALT+SHIFT+O` — Open settings

**DB location:** `%APPDATA%\Focus\focus.db`

---

## Known Issues / Limitations

- `core_stub.js` is the live timer engine; no Rust integration yet (timing is fine in practice)
- Autofill DevTools errors in console are benign Chromium noise
- No code signing — Windows SmartScreen may warn on first run
- No auto-update — users must download new releases manually
