# Milestone: Native Rust Core Integration ⚙️

**Sprint Name:** Rust Core  
**Priority:** LOW  
**Estimated Time:** 3-4 days  
**Status:** ⏳ PLANNED (Blocked by: Polish + Database)  
**Target Start:** October 16-17, 2025

---

## 🎯 Sprint Goal

Replace JavaScript stub (`core_stub.js`) with native Rust module using `neon-bindings` for production-grade timing accuracy and performance.

---

## 📋 Sprint Backlog (High-Level)

### Task 1: Setup Neon Bindings
- Install neon-cli
- Initialize native module structure
- Configure build system

### Task 2: Port Rust Logic
- Copy Pomodoro engine from old `core/`
- Remove flutter_rust_bridge code
- Adapt for neon-bindings FFI

### Task 3: Create FFI Bindings
- Export startWork, pause, resume, stop, snapshot
- Handle JSON serialization
- Error handling

### Task 4: Integration & Testing
- Replace core_stub.js imports
- Test all timer functionality
- Benchmark performance
- Validate monotonic timing

### Task 5: Platform Packaging
- Build native module for Windows
- Test on different Windows versions
- Document build process

---

## 📊 Success Criteria

- ✅ Native Rust module compiles and runs
- ✅ All timer features work identically
- ✅ No performance degradation
- ✅ Timing is more accurate than stub
- ✅ Can handle sleep/wake scenarios

---

## 🔧 Technical Notes

### Why Native Rust?
- Monotonic clock (immune to system time changes)
- Sleep/wake drift correction
- Production-grade timing accuracy
- Future: cross-platform consistency

### Why Later?
- JavaScript stub is sufficient for MVP
- Adds build complexity
- Can be done after user testing

---

*Detailed tasks will be added when sprint begins*

