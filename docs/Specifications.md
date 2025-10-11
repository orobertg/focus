# Focus Bubbles — Product & Technical Specification (Draft v0.1)

> Floating, non-intrusive Pomodoro + tasks/notes/calendar with Rust core precision and Flutter UI polish.

---

## 1) Product Overview

**Goal:** A lightning-fast, low‑friction focus app with small draggable bubbles and a slim floating toolbar. Timers follow the **Pomodoro Technique** with precise timing, background safety, and cross‑platform parity. Optional AI assists with summaries, schedule evaluation, and suggestions.

**Primary platforms:** Windows, macOS, Linux (desktop‑first). Mobile (iOS/Android) in Phase 2.

**Key pillars:**

* **Non‑intrusive floating UI with click-through** (CRITICAL: must allow user to work in other apps uninterrupted)
  - Always‑on‑top, draggable, minimal
  - Click-through enabled when timer is idle/running (bubble "fades to background")
  - Click-through disabled during drag or active interaction
  - Small floating bubble with expand-on-drag behavior
* First‑class Pomodoro engine (Rust, monotonic clock, drift correction)
* Fast drag‑drop to schedule tasks/events
* Notes/screenshots capture and quick attachment to tasks
* Optional AI (local via Ollama, or cloud) for summaries and planning
* Local‑first with optional E2EE sync server

---

## 2) Personas

1. **Engineer/Analyst (Power user)** — keyboard‑first, wants global hotkeys, JSON/YAML export, and precise timers.
2. **Manager/Researcher** — needs quick task scheduling, calendar blocks, and daily/weekly insights.
3. **Student** — wants presets, streaks, and progress stats.

---

## 3) UX Requirements

### 3.1 Floating Bubble (with Click-Through)

**CORE REQUIREMENT:** The floating bubble MUST support click-through to enable truly non-intrusive operation. Users must be able to work in other applications without the timer bubble blocking their workflow.

* Circular bubble with progress ring and time remaining
* **Click-through behavior:**
  - Enabled when timer is idle or running (bubble allows clicks to pass through to apps below)
  - Disabled temporarily when user drags the bubble (expand to larger size, capture interactions)
  - Disabled when hovering/interacting with controls (buttons become clickable)
  - Re-enabled after ~250ms of no interaction (shrink back to small size)
* **Expand-on-drag pattern:**
  - Small size: 180px (click-through enabled)
  - Large size: 340px (during drag/interaction, click-through disabled)
  - Smooth animation between sizes
* Tap/click center: **Play/Pause**. Side buttons: **Skip**, **Extend +5**, **Settings**
* Drag anywhere; remembers last screen position per display
* Snap to screen edges when dropped near edges

### 3.2 Floating Toolbar

* Draggable horizontal pill with: presets (25/5, 50/10…), **Stop**, and quick menu.
* Detachable/closeable without quitting app.

### 3.3 Mini Panels (slide‑in)

* **Timeline** (day/week) for drag‑drop scheduling of focus blocks.
* **Kanban** (Backlog/Doing/Done) for tasks.
* **Notes** (Markdown) with quick screenshot attach.
* Panels collapse to icons in the toolbar; open on hover/click. [TBD]

### 3.4 Accessibility & Input

* Full keyboard control and **global hotkeys**.
* High‑contrast theme and screen‑reader labels. [TBD]

---

## 4) Pomodoro Engine (Authoritative, Rust)

* **Config:** Work, Short/Long Break, Cycles per set, Auto‑start next step, Max auto cycles.
* **States:** Idle → WorkRunning/Paused → WorkCompleted → BreakRunning/Paused → …
* **Clock:** `std::time::Instant` (monotonic). Recompute on resume after sleep.
* **Ownership:** Single active device controls a live session. Others mirror; can request hand‑off. [Phase 2]
* **Data:** Sessions, events, daily stats persisted locally (SQLite snapshot + event log).

---

## 5) Tasks, Calendar, Notes, Media

* **Tasks:** title, labels, priority, estimate, due, status, links to notes.
* **Calendar blocks:** created by dragging a task to the timeline or starting a session.
* **Notes:** Markdown with image/audio embeds; paste screenshots; clipboard watcher optional.
* **Screenshots:** desktop hotkey; auto‑attach to current task or stash in Inbox.
* **Dictation:** OS‑level dictate; optional Whisper (local) on desktop.

---

## 6) AI (Optional, Pluggable)

* Providers: **Ollama** (local), OpenAI/Anthropic (cloud), None.
* Jobs: “Summarize this note”, “Plan my day”, “Weekly review”, “Suggest sprint focus”.
* Guardrails: dry‑run preview; never changes scheduling without user confirm.

---

## 7) Architecture

**MIGRATION TO ELECTRON:** Due to critical requirement for reliable click-through functionality on Windows desktop, the frontend is being migrated from Flutter to Electron. This provides stable, mature APIs for window management including `setIgnoreMouseEvents()` for click-through.

* **UI:** Electron + React/TypeScript (or Vue/Svelte - TBD)
  - Chromium-based rendering
  - Native OS window APIs via Electron
  - HTML/CSS for UI with modern framework
* **Core:** Rust crate (FFI via `neon-bindings` or direct IPC)
  - Pomodoro engine logic remains in Rust for precision and reliability
  - IPC communication between Electron main process and Rust core
* **Persistence:** SQLite (better-sqlite3 on Node.js, `rusqlite` in Rust core)
* **Sync (optional):** Axum server + Postgres + S3/MinIO. **E2EE**: server stores only encrypted blobs/CRDT deltas. [Phase 2]
* **Search:** SQLite FTS5; optional vector index for AI. [Phase 2]

**Architecture Benefits:**
- Proven, stable click-through implementation (`setIgnoreMouseEvents`)
- Rich ecosystem of npm packages for desktop features
- Easier platform-specific window management
- Smaller bundle size with tree-shaking
- Simpler debugging with Chrome DevTools

---

## 8) Data Model (v0)

```
Note  { id, title, body_md|crdt, tags[], attachments[], created_at, updated_at }
Task  { id, note_id?, title, status, priority, estimate_min, labels[], due }
Event { id, task_id?, starts_at, ends_at, reminder[], recurrence? }
Timer { id, task_id?, event_id?, state, started_at, elapsed_ms, pomo_cfg }
Cfg   { user_id, prefs_json, hotkeys, theme, telemetry_opt_in }
```

---

## 9) APIs (FFI surface)

* `start_work(plan)` → `SessionSnapshot`
* `pause()` / `resume()` / `skip()` / `stop()`
* `extend_work(+minutes)`
* `snapshot()` (millis_total, millis_elapsed, phase, run_state, cycle_index)

---

## 10) Notifications & Background

* **Windows:** tray icon, toast notifications, foreground service equivalent.
* **macOS:** menu‑bar extra, NSUserNotifications.
* **Linux:** libnotify, appindicator tray.
* **Rules:** single alarm per phase; no busy loops; drift correction on wake.

---

## 11) Security & Privacy

* Local‑first storage; optional **E2EE** for sync.
* Biometric/Windows Hello unlock for sensitive items (API permitting). [TBD]
* No analytics by default; opt‑in minimal telemetry. [TBD]

---

## 12) Performance Budgets

* Bubble redraw ≤ 16ms/frame; snapshot polling ≤ 4 Hz.
* Background CPU wake ≤ 1/phase; no second‑by‑second polling when hidden.
* Cold start ≤ 500ms after first run cache.

---

## 13) Packaging & Updates

* Windows: MSIX/EXE with built‑in updater.
* macOS: notarized .app + DMG; Sparkle/auto‑update.
* Linux: AppImage/DEB/RPM. [TBD]

---

## 14) Roadmap

* **Phase 1 (MVP desktop):** Bubble + toolbar + robust Pomodoro engine; notes quick‑capture; screenshots; local DB; hotkeys.
* **Phase 2:** Sync + E2EE + multi‑device; AI jobs; calendar/kanban panels; stats & streaks.
* **Phase 3:** Mobile clients; cross‑device session hand‑off; integrations (CalDAV/ICS).

---

## 15) Open Questions (Please answer inline)

1. **Target OS (primary)**: Windows / macOS / Linux — which is your day‑to‑day? Target Windows but compatibility with macOS and Linux.
2. **Bubble size presets** you want (px): Small/Default/Large? Default.
3. **Default Pomodoro plan**: work, short break, long break, cycles per set, auto‑start? Work.
4. **Hotkeys** (Windows defaults): Start/Stop, Pause/Resume, Skip, Extend +5 — preferred combos? ALT+SHIFT+P to show the main panel.
5. **Toolbar presets** (labels & timings): ex. `25/5`, `50/10`, `90/15`?
6. **Notes format**: Markdown only, or rich text (WYSIWYG) with Markdown export? Markdown
7. **Screenshots**: global hotkey(s) and default destination (attach to active task vs Inbox)? ALT+SHIFT+S
8. **Task model**: Must‑have fields (labels, priority, estimate, due, status)? Any custom fields? Check-box to mark complete. Can drag and drop into an empty calendar position to block time out for the task. Allow adjustment to the calendar event to increase the task's calendar event start and stop time.
9. **Calendar**: need ICS/CalDAV sync in v1, or local calendar first? local calendar first. Sync later.
10. **AI provider** for dev: None / Ollama (local) / OpenAI / Anthropic — which to wire first? Ollama local first, specifically for testing. Then, openAI second. Later anthropic.
11. **Security posture**: enable local vault lock (passcode/Windows Hello) at launch or only when idle? At launch.
12. **Telemetry**: opt‑in metrics (yes/no)? If yes, which (crash only, or minimal usage like session counts)? yes opt-in metrics.
13. **Packaging priority**: which installer to ship first (MSIX/EXE/DMG/AppImage)? msix.
14. **Branding**: app name, icon theme/colors, and any copy guidelines? Taking inspiration from the theme and colors from this site: https://dribbble.com/
15. **Import/Export**: CSV/JSON for tasks/stats? Markdown zip for notes? Yes, version 2.

---

## 16) Acceptance Criteria (MVP)

* **Click-through functionality works reliably** (CRITICAL)
  - User can click through idle/running timer to interact with apps below
  - Bubble expands and becomes interactive during drag
  - Click-through re-enables automatically after interaction ends
  - No crashes or instability related to window management
* Start/pause/resume/skip/extend works reliably with monotonic timing and sleep/wake correction
* Bubble + toolbar are draggable, always‑on‑top, and persist position across restarts
* Presets function (25/5 & 50/10)
* Global hotkeys operate when window is unfocused
* Notes capture with quick screenshot attach
* Local persistence (SQLite); restart recovery of an active session
* Unit tests: phase transitions, extend/skip behavior, sleep/wake drift

---

## 17) Risks & Mitigations

* **Background limitations (macOS, Linux)** → rely on system notifications + recompute on resume.
* **FFI complexity** → thin, stable API; integration tests; pinned versions.
* **Sync security** → E2EE by default; server stores only ciphertext.

---

### Change Log

* v0.1 — Initial draft.
