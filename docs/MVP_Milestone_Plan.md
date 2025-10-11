# Focus Bubbles — MVP Milestone Plan (Electron Migration)

> Development roadmap for Electron-based implementation with Rust core

---

## 🎯 CURRENT STATUS (2025-10-11)

**Phase Complete:** Phase 1 (Foundation) ✅  
**Phase In Progress:** Phase 2 (Core Features) - 90% Complete 🚧  
**Next Phase:** Phase 3 (Additional Features) ⏳

### What's Working NOW ✅
- ✅ Electron app with click-through functionality
- ✅ Beautiful timer UI (280x280 rounded square, 50px corners)
- ✅ Progress ring animation with proper centering
- ✅ Pause/Break state visualization with yellow dots
- ✅ Break blinking animation and cooldown visualization
- ✅ Independent toolbar window with IPC communication
- ✅ Draggable windows with position persistence
- ✅ Global hotkeys (ALT+SHIFT+P, C, S, N)
- ✅ System tray integration
- ✅ Timer functional with JavaScript stub

### What's Pending ⏳
- ⏳ SQLite database integration
- ⏳ Session persistence and recovery
- ⏳ Notes capture functionality
- ⏳ Settings panel
- ⏳ Timer presets (25/5, 50/10)
- ⏳ Native Rust core integration (currently using JS stub)
- ⏳ App icon (SVG created, needs PNG conversion)
- ⏳ Extend +5 button

---

## 🚀 RECOMMENDED NEXT STEPS

### Option A: Polish Current Features (Quick Wins) ⭐ RECOMMENDED
**Time:** 1-2 days  
1. Create app icon (convert SVG → PNG at multiple sizes)
2. Fix `electron-store` TypeError warning
3. Implement Settings panel (configure durations)
4. Add timer presets to toolbar (25/5, 50/10, custom)
5. Implement Extend +5 functionality
6. Add sound notifications (optional beep on phase complete)

### Option B: Database Integration (Core Infrastructure)
**Time:** 2-3 days  
1. Install `better-sqlite3`
2. Create database schema (sessions, notes, settings)
3. Implement session save/load
4. Add session recovery on app restart
5. Store user preferences

### Option C: Native Rust Integration (Performance)
**Time:** 3-4 days  
1. Set up `neon-bindings`
2. Port Rust core logic
3. Create FFI bindings
4. Replace `core_stub.js` with native module
5. Test performance and accuracy

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
**Priority: CRITICAL** | **Status: ✅ COMPLETE**

#### Milestone 1.1: Electron Setup & Click-Through Validation ✅
- [x] Initialize Electron project ~~with TypeScript~~ (vanilla JS chosen for simplicity)
- [x] Set up development environment (hot reload via `npm start`, debugging)
- [x] Create basic frameless window
- [x] **CRITICAL TEST:** Implement and validate `setIgnoreMouseEvents(true)`
  - [x] Verify click-through works on Windows
  - [x] Test toggle click-through (ALT+SHIFT+C)
  - [x] Confirm no crashes or stability issues

**Success Criteria:**
- ✅ Frameless window displays
- ✅ Click-through works reliably
- ✅ Can toggle click-through programmatically
- ✅ No crashes during state transitions

---

#### Milestone 1.2: Basic UI & Window Management ✅
- [x] ~~Set up React + TypeScript + Vite~~ (Pure HTML/CSS/JS for simplicity)
- [x] Create timer bubble component (280x280 rounded square)
- [x] Create separate toolbar window (160x52)
- [x] Implement dragging with position persistence (`electron-store`)
- [x] Add always-on-top window flag
- [x] Style with CSS to match Flutter UI design
- [x] Implement proper rounded corners (50px border-radius)
- [x] Remove transparency (solid backgrounds)

**Success Criteria:**
- ✅ Bubble renders with rounded square shape
- ✅ Draggable with smooth interaction
- ✅ Position persists across app restarts
- ✅ Always stays on top of other windows
- ✅ Toolbar is independent, draggable window

---

#### Milestone 1.3: Rust Core Integration (STUB)
- [x] Create JavaScript stub (`core_stub.js`) that mimics Rust API
- [x] Implement timer state management in stub:
  - `startWork()` → SessionSnapshot
  - `pauseTimer()`, `resumeTimer()`, `stopTimer()`
  - `getSnapshot()` → current timer state
- [x] Implement timer tick updates (250ms polling)
- [ ] **PENDING:** Replace stub with native Rust module via `neon-bindings`

**Success Criteria:**
- ✅ Electron can call timer functions
- ✅ Timer state updates correctly
- ✅ Timing is accurate
- ⏳ **TODO:** Native Rust integration

---

### **Phase 2: Core Features** 🔧
**Priority: HIGH** | **Status: 🚧 IN PROGRESS (90% Complete)**

#### Milestone 2.1: Timer UI & Controls ✅
- [x] Display time remaining in MM:SS format
- [x] Show progress ring animation (SVG with stroke-dashoffset)
- [x] Add phase icon (eye for focus, coffee mug for break)
- [x] Implement START/PAUSE button
- [x] Add Reset and Settings buttons
- [x] Display progress dots (4 dots for pause/break visualization)
- [x] Add pause/break dot animations (light up yellow, blink during break)
- [x] Implement cooldown visualization (dots reset one by one)
- [x] Beautiful UI with proper spacing and alignment
- [ ] **TODO:** Implement Extend +5 button functionality

**Success Criteria:**
- ✅ Timer displays correctly
- ✅ All main controls are functional
- ✅ UI matches design specification
- ✅ Animations are smooth
- ⏳ Extend functionality pending

---

#### Milestone 2.2: Toolbar & Communication ✅
- [x] Create floating toolbar window (separate from bubble)
- [x] Add Play/Pause, Stop, Notes buttons
- [x] Make toolbar draggable with position persistence
- [x] Connect toolbar to bubble state via IPC
- [x] Synchronize play/pause icon with timer state
- [ ] **TODO:** Add preset buttons (25/5, 50/10, custom)
- [ ] **TODO:** Add toolbar collapse/expand

**Success Criteria:**
- ✅ Toolbar displays independently
- ✅ Toolbar controls work via IPC
- ✅ Toolbar position persists
- ⏳ Presets pending

---

#### Milestone 2.3: Global Hotkeys ✅
- [x] Implement ALT+SHIFT+P (toggle panel visibility)
- [x] Implement ALT+SHIFT+C (click-through toggle)
- [x] Implement ALT+SHIFT+S (screenshot - placeholder)
- [x] Implement ALT+SHIFT+N (notes toggle - placeholder)
- [x] Register hotkeys system-wide via `electron-localshortcut`
- [x] Handle unregister on app quit

**Success Criteria:**
- ✅ Hotkeys work when app is unfocused
- ✅ All hotkeys registered
- ✅ No conflicts with system hotkeys
- ⏳ Screenshot/notes functionality pending

---

#### Milestone 2.4: Persistence Layer ⏳
- [x] Basic position persistence via `electron-store`
- [ ] **TODO:** Integrate `better-sqlite3` for SQLite
- [ ] **TODO:** Create database schema
  - Sessions table
  - Session history table
  - Notes table
  - Settings table
- [ ] **TODO:** Implement session save/load
- [ ] **TODO:** Implement session recovery on restart
- [ ] **TODO:** Store user preferences (durations, notifications)

**Success Criteria:**
- ✅ Window positions persist
- ⏳ Timer state persistence pending
- ⏳ Session recovery pending
- ⏳ Database implementation pending

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
