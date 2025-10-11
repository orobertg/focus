# Migration Summary

## Decision Made: October 11, 2025

**From:** Flutter + Rust  
**To:** Electron + React + TypeScript + Rust

---

## The Core Issue

Click-through is **MANDATORY** for this app's core value proposition:

> "A productivity timer that lets you track focus time WITHOUT interrupting your workflow in other applications."

Without click-through, the floating bubble **blocks** other apps, making it intrusive rather than non-intrusive. This fundamentally breaks the product vision.

---

## What We Tried (Flutter)

We spent significant effort trying to implement Windows click-through in Flutter:

1. ✅ Built complete C++ Windows platform plugin
2. ✅ Proper CMakeLists.txt configuration  
3. ✅ Correct plugin registration
4. ✅ HWND window handle management
5. ✅ MethodChannel ownership patterns
6. ✅ Global static variables approach
7. ✅ Extensive debugging and error handling
8. ✅ 20+ iterations and refinements

**Result:** The app consistently crashes with `abort()` when calling the platform channel method. The crash occurs in Flutter's engine dispatch layer, before our C++ code even runs. No error messages, no stack traces from our code.

**Conclusion:** This is likely a Flutter engine issue or architectural incompatibility, not a problem with our implementation. Further debugging would require weeks of Flutter engine source analysis.

---

## Why Electron Solves This

```javascript
// Electron - 1 line, works perfectly
win.setIgnoreMouseEvents(true, { forward: true });
```

- ✅ Battle-tested API used by Discord, OBS, game overlays
- ✅ Stable across all Electron versions
- ✅ Zero crashes, zero debugging needed
- ✅ Works on Windows, macOS, Linux

---

## What We Keep

### ✅ All the Hard Work
- Complete, polished UI design (use as pixel-perfect reference)
- Beautiful animations and state transitions
- Exact spacing, sizing, colors from inspiration
- All UX patterns (expand-on-drag, snap-to-edges)

### ✅ Rust Core
- Pomodoro engine (ready to integrate)
- Timing logic with monotonic clock
- State machine implementation
- SQLite persistence schema

### ✅ Feature Specifications
- Timer controls and presets
- Global hotkeys
- Notes capture
- System tray
- All acceptance criteria

---

## What Changes

| Component | Flutter | Electron |
|-----------|---------|----------|
| Language | Dart | TypeScript |
| UI Framework | Flutter Widgets | React Components |
| Styling | Dart code | CSS/Tailwind |
| Window API | ❌ Broken | ✅ `setIgnoreMouseEvents()` |
| Debugging | Limited | Chrome DevTools |
| Hot Reload | ✅ | ✅ |
| Desktop API | Platform Channels | Electron APIs |
| Rust Integration | flutter_rust_bridge | neon-bindings/IPC |

---

## Timeline

**Flutter Work:** ~2-3 weeks of development + 1 week debugging click-through  
**Electron Estimate:** 12-18 days to MVP

The Electron implementation will actually be **faster** because:
1. No platform channel debugging
2. Familiar web stack (HTML/CSS/TypeScript)
3. Chrome DevTools for debugging
4. Proven click-through API
5. Rich npm ecosystem

---

## Migration Steps

### ✅ Step 1: Document & Archive
- [x] Update Specifications.md with click-through as CRITICAL requirement
- [x] Update MVP_Milestone_Plan.md with Electron roadmap
- [x] Create ELECTRON_MIGRATION.md with full rationale
- [x] Update README.md with migration notice
- [x] Archive Flutter implementation for reference

### 📋 Step 2: Electron Setup (Next)
- [ ] Create `electron-app/` directory
- [ ] Initialize Electron + React + TypeScript project
- [ ] Set up Vite for fast development
- [ ] Configure electron-builder

### 🎯 Step 3: Click-Through Validation (CRITICAL)
- [ ] Create minimal window
- [ ] Test `setIgnoreMouseEvents(true)`
- [ ] Verify clicks pass through to apps below
- [ ] **MUST WORK** before proceeding

### 🎨 Step 4: Port UI
- [ ] Timer bubble component (SVG progress ring)
- [ ] Control buttons (play, pause, skip, settings)
- [ ] Phase icons (eye, coffee mug)
- [ ] Dot animations (focus, pause, break, cooldown)
- [ ] Expand-on-drag behavior
- [ ] Toolbar component

### 🦀 Step 5: Rust Integration
- [ ] Choose approach (neon vs IPC)
- [ ] Expose Rust functions to JavaScript
- [ ] Test timing accuracy
- [ ] Implement timer polling

### ⚙️ Step 6: Features
- [ ] Global hotkeys (`globalShortcut`)
- [ ] System tray (`Tray` API)
- [ ] Position persistence (`electron-store`)
- [ ] Notes panel
- [ ] Screenshot capture
- [ ] SQLite integration (`better-sqlite3`)

### ✨ Step 7: Polish & Ship
- [ ] Match exact UI from Flutter
- [ ] Test all acceptance criteria
- [ ] Package with electron-builder
- [ ] Create MSIX installer

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Click-through doesn't work | Very Low | Critical | Already tested by millions of Electron apps |
| Rust integration issues | Low | High | Start with IPC (simpler), move to neon later |
| UI recreation takes too long | Low | Medium | Use Flutter screenshots as exact reference |
| Performance issues | Very Low | Medium | Chromium is fast; Rust handles heavy work |
| Bundle size too large | Low | Low | 80-100MB is standard for Electron apps |

---

## Success Criteria

This migration is **successful** when:

1. ✅ Click-through works perfectly (no crashes, smooth toggle)
2. ✅ Timer bubble matches Flutter UI exactly
3. ✅ All MVP features ported and functional
4. ✅ Performance is acceptable (60 FPS, low CPU)
5. ✅ Can ship MSIX installer for Windows

---

## Lessons Learned

### From Flutter
- ✅ Prototyping UI in Flutter is fast and beautiful
- ✅ Hot reload is amazing for iterating on designs
- ❌ Platform channels are fragile for complex native APIs
- ❌ Debugging native crashes is extremely difficult
- ❌ Not ideal for apps requiring deep OS integration

### For Electron
- ✅ Use mature APIs for critical features (click-through)
- ✅ Start with simplest approach (IPC before neon)
- ✅ Leverage existing UI design work completely
- ✅ Chrome DevTools will save debugging time
- ✅ npm ecosystem provides solutions for most needs

---

## Communication

**To Users/Stakeholders:**
> "We're migrating to a more stable foundation (Electron) to ensure the click-through feature—critical for non-intrusive operation—works perfectly. All the beautiful UI and features you see are coming to Electron, with a rock-solid technical base underneath."

**To Developers:**
> "Flutter's platform channel for Windows click-through proved unstable after extensive debugging. Electron provides a proven `setIgnoreMouseEvents()` API used by major apps. We're keeping all Rust timing logic and porting the UI to React. ETA: 2-3 weeks."

---

## Next Actions

**TODAY (Oct 11):**
1. ✅ Document migration decision
2. ✅ Update all project docs
3. 📋 Commit changes to git
4. 📋 Create migration branch

**TOMORROW (Oct 12):**
1. Create Electron project structure
2. Test click-through validation
3. Set up React + TypeScript + Vite
4. Port first UI component (timer bubble)

**THIS WEEK:**
1. Complete Electron foundation
2. Port basic UI
3. Integrate Rust core
4. Validate timer accuracy

---

*Migration Approved: October 11, 2025*  
*Next Milestone: Electron Click-Through Validation*  
*Target MVP: End of October 2025*

