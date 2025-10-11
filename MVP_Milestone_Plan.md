# Focus Bubbles — MVP Milestone Plan (Electron Migration)

> Development roadmap for Electron-based implementation with Rust core

---

## MIGRATION DECISION 🔄

**Status:** Migrating from Flutter to Electron

**Reason:** Click-through functionality is a **CRITICAL, NON-NEGOTIABLE** requirement for this productivity app. After extensive debugging with Flutter's Windows platform channel, Electron provides a proven, stable solution via `setIgnoreMouseEvents()`.

**What We Keep:**
- ✅ All Rust Pomodoro engine logic (timing, state machine, persistence)
- ✅ SQLite database structure
- ✅ UI/UX design principles (bubble, expand-on-drag, timer display)
- ✅ Product specifications and acceptance criteria

**What Changes:**
- Frontend: Flutter → Electron + React/TypeScript
- FFI: flutter_rust_bridge → neon-bindings or IPC
- Window Management: Native Electron APIs

---

## Previous Flutter Work (Archived)

### Completed Features ✅
- [x] Flutter app running on Windows
- [x] Draggable bubble UI with timer display (280x280 → 360x360 expand)
- [x] Pomodoro timer logic (stub engine)
- [x] Global hotkeys (ALT+SHIFT+P, ALT+SHIFT+S, ALT+SHIFT+N)
- [x] Position persistence (SharedPreferences)
- [x] SQLite persistence layer (sessions, notes)
- [x] System tray integration
- [x] Notes capture with screenshot support
- [x] Pause/Break state visualization with dot animations
- [x] Beautiful, polished timer UI matching inspiration design

### What Didn't Work ❌
- Windows click-through platform channel (persistent crashes)
- Flutter's C++ plugin architecture for this specific use case

---

## Electron MVP Milestones

### **Phase 1: Foundation & Proof of Concept** 🎯
**Priority: CRITICAL** | **Time Estimate: 3-5 days**

#### Milestone 1.1: Electron Setup & Click-Through Validation
- [ ] Initialize Electron project with TypeScript
- [ ] Set up development environment (hot reload, debugging)
- [ ] Create basic frameless window
- [ ] **CRITICAL TEST:** Implement and validate `setIgnoreMouseEvents(true)`
  - [ ] Verify click-through works on Windows
  - [ ] Test expand-on-drag (disable click-through during interaction)
  - [ ] Test shrink-after-drop (re-enable click-through)
  - [ ] Confirm no crashes or stability issues

**Success Criteria:**
- ✅ Frameless window displays
- ✅ Click-through works reliably
- ✅ Can toggle click-through programmatically
- ✅ No crashes during state transitions

---

#### Milestone 1.2: Basic UI & Window Management
- [ ] Set up React + TypeScript + Vite (or similar)
- [ ] Create circular timer bubble component (180px small, 340px large)
- [ ] Implement dragging with position persistence
- [ ] Add always-on-top window flag
- [ ] Implement snap-to-edges
- [ ] Style with CSS to match Flutter UI design

**Success Criteria:**
- ✅ Bubble renders with circular shape
- ✅ Draggable with smooth animations
- ✅ Position persists across app restarts
- ✅ Always stays on top of other windows

---

#### Milestone 1.3: Rust Core Integration
- [ ] Install `neon-cli` or set up IPC mechanism
- [ ] Port Rust Pomodoro engine (reuse existing `core/src/lib.rs`)
- [ ] Create JavaScript bindings for Rust functions:
  - `startWork(plan)` → SessionSnapshot
  - `pause()`, `resume()`, `skip()`, `stop()`
  - `extendWork(minutes)`
  - `snapshot()` → current timer state
- [ ] Test FFI/IPC communication between Electron and Rust
- [ ] Implement timer tick updates (250ms polling or event-based)

**Success Criteria:**
- ✅ Electron can call Rust functions
- ✅ Timer state updates correctly
- ✅ No memory leaks or performance issues
- ✅ Timing is accurate (monotonic clock)

---

### **Phase 2: Core Features** 🔧
**Priority: HIGH** | **Time Estimate: 4-6 days**

#### Milestone 2.1: Timer UI & Controls
- [ ] Display time remaining in MM:SS format
- [ ] Show progress ring animation
- [ ] Add phase icon (eye for focus, coffee mug for break)
- [ ] Implement START/PAUSE button
- [ ] Add Reset, Extend +5, Settings buttons
- [ ] Display progress dots (4 dots for focus cycles)
- [ ] Implement expand-on-drag behavior with click-through toggle
- [ ] Add pause/break dot animations (light up, blink, cooldown)

**Success Criteria:**
- ✅ Timer displays correctly
- ✅ All controls are functional
- ✅ UI matches design specification
- ✅ Animations are smooth

---

#### Milestone 2.2: Toolbar & Presets
- [ ] Create floating toolbar window (separate from bubble)
- [ ] Add preset buttons (25/5, 50/10, custom)
- [ ] Implement preset application
- [ ] Make toolbar draggable with position persistence
- [ ] Add toolbar collapse/expand
- [ ] Connect toolbar to bubble state

**Success Criteria:**
- ✅ Toolbar displays with presets
- ✅ Presets apply correctly
- ✅ Toolbar position persists
- ✅ Toolbar can be hidden/shown

---

#### Milestone 2.3: Global Hotkeys
- [ ] Implement ALT+SHIFT+P (toggle panel visibility)
- [ ] Implement ALT+SHIFT+S (screenshot)
- [ ] Implement ALT+SHIFT+N (notes toggle)
- [ ] Implement ALT+SHIFT+C (click-through toggle - for debugging)
- [ ] Register hotkeys system-wide
- [ ] Handle unregister on app quit

**Success Criteria:**
- ✅ Hotkeys work when app is unfocused
- ✅ All hotkeys trigger correct actions
- ✅ No conflicts with system hotkeys

---

#### Milestone 2.4: Persistence Layer
- [ ] Integrate `better-sqlite3` for SQLite
- [ ] Port database schema from Flutter implementation
  - Sessions table
  - Session history table
  - Notes table
- [ ] Implement session save/load
- [ ] Implement session recovery on restart
- [ ] Store user preferences
- [ ] Implement database migrations

**Success Criteria:**
- ✅ Timer state persists across restarts
- ✅ Can recover active session
- ✅ Notes are stored and retrievable
- ✅ Database migrations work

---

### **Phase 3: Additional Features** 📝
**Priority: MEDIUM** | **Time Estimate: 3-4 days**

#### Milestone 3.1: Notes Capture
- [ ] Create notes panel window
- [ ] Implement text input with Markdown support
- [ ] Add screenshot capture (ALT+SHIFT+S)
- [ ] Implement file attachment
- [ ] Store notes in SQLite
- [ ] Display list of existing notes
- [ ] Make notes panel draggable with position persistence

**Success Criteria:**
- ✅ Can create and save notes
- ✅ Screenshot capture works
- ✅ Notes persist across restarts
- ✅ Basic Markdown rendering works

---

#### Milestone 3.2: System Tray
- [ ] Create system tray icon
- [ ] Add right-click context menu
  - Start/Stop
  - Presets
  - Show/Hide
  - View Stats
  - Quit
- [ ] Implement tray icon tooltip
- [ ] Handle left-click (show/hide main window)
- [ ] Update tray icon based on timer state

**Success Criteria:**
- ✅ Tray icon displays
- ✅ Context menu works
- ✅ Can control app from tray
- ✅ App can run in background

---

### **Phase 4: Polish & Testing** ✨
**Priority: HIGH** | **Time Estimate: 2-3 days**

#### Milestone 4.1: UI Polish
- [ ] Match exact spacing and proportions from inspiration design
- [ ] Implement all icon states (eye closed, eye open, coffee mug)
- [ ] Add smooth animations for state transitions
- [ ] Implement blink animation for break dots
- [ ] Add cooldown visualization
- [ ] Test on different screen sizes and DPI settings

**Success Criteria:**
- ✅ UI matches design specification
- ✅ All animations are smooth
- ✅ Works on different displays

---

#### Milestone 4.2: Testing & Validation
- [ ] Unit tests for Rust core (phase transitions, timing)
- [ ] Integration tests for Electron-Rust communication
- [ ] Manual testing checklist for all features
- [ ] Test session recovery scenarios
- [ ] Test sleep/wake behavior
- [ ] Validate all acceptance criteria

**Success Criteria:**
- ✅ All tests pass
- ✅ MVP acceptance criteria met
- ✅ No critical bugs

---

## MVP Acceptance Criteria (from Specifications.md)

- [ ] **Click-through functionality works reliably** (CRITICAL)
  - [ ] User can click through idle/running timer to interact with apps below
  - [ ] Bubble expands and becomes interactive during drag
  - [ ] Click-through re-enables automatically after interaction ends
  - [ ] No crashes or instability related to window management
- [ ] Start/pause/resume/skip/extend works reliably with monotonic timing
- [ ] Bubble + toolbar are draggable, always‑on‑top
- [ ] Persist position across restarts
- [ ] Presets function (25/5 & 50/10)
- [ ] Global hotkeys operate when window is unfocused
- [ ] Notes capture with quick screenshot attach
- [ ] Local persistence (SQLite); restart recovery of an active session
- [ ] Unit tests: phase transitions, extend/skip behavior, sleep/wake drift

---

## Technical Stack

### Frontend
- **Framework:** Electron 28+ (latest stable)
- **UI:** React 18 + TypeScript
- **Build:** Vite or Webpack
- **State:** Zustand or Jotai (lightweight state management)
- **Styling:** Tailwind CSS or Styled Components
- **Icons:** Lucide React or Heroicons

### Backend/Core
- **Engine:** Rust (existing `core` crate)
- **FFI:** `neon-bindings` or IPC (MessagePort/WebSocket)
- **Database:** SQLite via `better-sqlite3` (Node) + `rusqlite` (Rust)

### Build & Package
- **Builder:** `electron-builder`
- **Format:** MSIX (Windows Store) + portable EXE
- **Auto-update:** `electron-updater`

---

## Development Timeline

**Estimated Total:** 12-18 days (MVP)

- **Phase 1:** 3-5 days (Foundation)
- **Phase 2:** 4-6 days (Core Features)
- **Phase 3:** 3-4 days (Additional Features)
- **Phase 4:** 2-3 days (Polish & Testing)

---

## Next Immediate Steps

1. **Create Electron project structure**
   ```bash
   mkdir electron-app
   cd electron-app
   npm init -y
   npm install electron typescript react react-dom
   npm install -D @types/react @types/react-dom
   ```

2. **Set up basic window with click-through test**
   - Create `main.ts` with BrowserWindow
   - Test `setIgnoreMouseEvents(true)`
   - Validate on Windows

3. **Port Rust core with bindings**
   - Set up `neon-bindings` or IPC
   - Expose basic timer functions
   - Test from Electron

---

## Migration Checklist

- [ ] Archive Flutter codebase in `app-flutter-archived/`
- [ ] Create new `electron-app/` directory
- [ ] Copy Rust `core/` directory (no changes needed)
- [ ] Document Flutter UI specifications for recreation in React
- [ ] Take screenshots of Flutter UI for reference
- [ ] Update README.md with new stack and setup instructions

---

*Last Updated: 2025-10-11*
*Version: 2.0 (Electron Migration)*
