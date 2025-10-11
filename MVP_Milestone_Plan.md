# Focus Bubbles — MVP Milestone Plan

> Development roadmap to reach MVP based on Specifications.md acceptance criteria

---

## Current Status ✅

- Flutter app running on Windows
- Basic floating bubble UI with timer display
- Draggable bubble and toolbar
- Material widget errors resolved
- Windows desktop support configured

---

## MVP Milestone Tasks

### **1. Rust Core Integration** ✅
**Priority: HIGH** | **Status: COMPLETED**

- [x] Install `flutter_rust_bridge_codegen` if not already done
- [x] Generate FFI bindings between Flutter and Rust
- [x] Implement the Rust Pomodoro engine with proper timing logic
- [x] Replace `import 'stub_engine.dart'` with actual FFI calls
- [x] Test basic FFI communication

**Acceptance Criteria:**
- ✅ Flutter can call Rust functions successfully
- ✅ Timer state is managed by Rust core
- ✅ No more stub engine dependencies

---

### **2. Authoritative Pomodoro Engine** ✅
**Priority: HIGH** | **Status: COMPLETED**

- [x] Build Rust core with `std::time::Instant` for monotonic timing
- [x] Handle sleep/wake drift correction
- [x] Implement proper state machine: Idle → WorkRunning/Paused → WorkCompleted → BreakRunning/Paused
- [x] Add extend/skip functionality with proper phase transitions
- [x] Implement configurable Pomodoro plans (25/5, 50/10, etc.)
- [x] Auto-advance to next phase when current phase completes

**Acceptance Criteria:**
- ✅ Start/pause/resume/skip/extend works reliably with monotonic timing
- ✅ Sleep/wake correction works properly (using Instant which continues from sleep point)
- ✅ Phase transitions are accurate with auto-advance support
- ✅ Presets function (25/5 & 50/10)

---

### **3. Global Hotkeys** ✅
**Priority: MEDIUM** | **Status: COMPLETED**

- [x] Implement ALT+SHIFT+P to show/hide main panel
- [x] Add ALT+SHIFT+S for screenshots (placeholder for now)
- [x] Ensure hotkeys work when window is unfocused
- [x] Register/unregister hotkeys properly

**Acceptance Criteria:**
- ✅ Global hotkeys operate when window is unfocused (system-wide scope)
- ✅ Hotkeys toggle window visibility
- ✅ Screenshot hotkey is ready for future implementation

---

### **4. Persistence Layer** 💾
**Priority: MEDIUM** | **Estimated Time: 2-3 hours**

- [ ] Implement SQLite database for local storage
- [ ] Add session recovery (restart with active timer state)
- [ ] Store user preferences and position data
- [ ] Add database migration system

**Acceptance Criteria:**
- Local persistence (SQLite)
- Restart recovery of an active session
- User preferences persist across sessions

---

### **5. Position Persistence** ✅
**Priority: LOW** | **Status: COMPLETED**

- [x] Save bubble and toolbar positions across restarts
- [x] Restore positions on app launch
- [x] Use shared_preferences for storage

**Acceptance Criteria:**
- ✅ Bubble + toolbar persist position across restarts
- ✅ Positions are restored correctly on launch
- ✅ Positions saved automatically when dragging ends

---

### **6. Notes Capture System** 📝
**Priority: MEDIUM** | **Estimated Time: 2-3 hours**

- [ ] Quick notes capture functionality
- [ ] Screenshot attach capability
- [ ] Basic Markdown support
- [ ] Notes storage in SQLite

**Acceptance Criteria:**
- Notes capture with quick screenshot attach
- Notes are stored and retrievable
- Basic Markdown rendering works

---

### **7. Testing & Validation** 🧪
**Priority: HIGH** | **Estimated Time: 2-3 hours**

- [ ] Unit tests for phase transitions
- [ ] Extend/skip behavior tests
- [ ] Sleep/wake drift correction tests
- [ ] MVP acceptance criteria validation
- [ ] Integration tests for FFI

**Acceptance Criteria:**
- All unit tests pass
- MVP acceptance criteria are met
- No regressions in existing functionality

---

## MVP Acceptance Criteria (from Specifications.md)

- [x] Start/pause/resume/skip/extend works reliably with monotonic timing and sleep/wake correction
- [x] Bubble + toolbar are draggable, always‑on‑top
- [x] Persist position across restarts
- [x] Presets function (25/5 & 50/10)
- [x] Global hotkeys operate when window is unfocused
- [ ] Notes capture with quick screenshot attach
- [ ] Local persistence (SQLite); restart recovery of an active session
- [ ] Unit tests: phase transitions, extend/skip behavior, sleep/wake drift

---

## Development Phases

### **Phase 1: Core Foundation** (Current)
- Rust core integration
- Pomodoro engine implementation
- Basic persistence

### **Phase 2: User Experience** 
- Global hotkeys
- Position persistence
- Notes capture

### **Phase 3: Quality & Testing**
- Comprehensive testing
- MVP validation
- Performance optimization

---

## Next Steps

**Immediate Action:** Start with **Task 1: Rust Core Integration**

1. Install flutter_rust_bridge_codegen
2. Generate FFI bindings
3. Implement basic Rust Pomodoro functions
4. Replace stub engine calls

---

## Notes

- Each task should be completed and tested before moving to the next
- Regular commits after each major milestone
- Test on Windows primarily, but ensure cross-platform compatibility
- Follow the specifications for API design and data models
- Keep the UI minimal and non-intrusive as specified

---

*Last Updated: [Current Date]*
*Version: 1.0*
