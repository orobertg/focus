# Electron Migration Plan

## Executive Summary

**Decision:** Migrate from Flutter to Electron for Focus Bubbles desktop app.

**Reason:** Click-through functionality is a **CRITICAL, NON-NEGOTIABLE** requirement. After extensive debugging attempts with Flutter's Windows platform channel (20+ iterations, multiple approaches), we encountered consistent crashes when attempting to invoke platform channel methods for window management. Electron provides a proven, stable `setIgnoreMouseEvents()` API that is production-ready.

**Date:** 2025-10-11

---

## Why This Matters

The core UX premise of Focus Bubbles is:

> **A productivity app that allows users to track focus time and make notes WITHOUT interrupting their workflow in other applications.**

This requires:
1. Small floating timer bubble
2. Always-on-top window positioning
3. **Click-through when not actively being used** ← CRITICAL
4. Expand-on-drag for interaction, then shrink and re-enable click-through

Without reliable click-through, the app becomes **intrusive** rather than non-intrusive, fundamentally breaking the product vision.

---

## What We Tried with Flutter

### Approaches Attempted:
1. ✅ Built complete C++ Windows platform plugin
2. ✅ Proper plugin registration with `flutter::PluginRegistrar`
3. ✅ Correct `CMakeLists.txt` configuration with `flutter_wrapper_plugin`
4. ✅ `HWND` storage (not dangling pointers)
5. ✅ `MethodChannel` as class member with proper ownership
6. ✅ Global static variables for channel and plugin
7. ✅ Extensive error handling and Win32 API validation
8. ✅ Simplified handler to just log and return success
9. ✅ Multiple debugging iterations with console output

### Result:
- C++ plugin registers successfully ✅
- Window handle obtained ✅
- Method channel created ✅
- **Method handler NEVER invoked** ❌
- **Consistent `abort()` crashes** when Dart calls `setClickThrough()` ❌
- Crash occurs in Flutter engine dispatch layer, before our C++ code runs ❌

### Conclusion:
The issue is not with our implementation but with the Flutter engine's method channel dispatch mechanism for this specific use case. Further debugging would require:
- Flutter engine source code analysis
- Custom Flutter engine build
- Potential Flutter engine bug report
- Weeks/months of additional investigation

This is not viable for MVP delivery.

---

## Electron Advantages

### 1. **Proven Click-Through API**
```javascript
win.setIgnoreMouseEvents(true, { forward: true });
```
- Used by Discord, OBS, game overlays
- Stable across Electron versions
- Well-documented
- Zero crashes

### 2. **Mature Window Management**
- `setAlwaysOnTop()`
- `setPosition()`, `setSize()`
- `show()`, `hide()`
- `setSkipTaskbar()`
- All stable, well-tested APIs

### 3. **Rich Ecosystem**
- `better-sqlite3` for SQLite
- `electron-store` for preferences
- `globalShortcut` for hotkeys
- `nativeImage` for tray icons
- Thousands of npm packages

### 4. **Development Experience**
- Chrome DevTools for debugging
- Hot reload with webpack/vite
- TypeScript support out of box
- React DevTools
- Familiar web stack

### 5. **Distribution**
- `electron-builder` for packaging
- MSIX, EXE, DMG, AppImage support
- Auto-updater built-in
- Code signing tools

---

## What We Keep

### ✅ Rust Pomodoro Core
- All timing logic
- State machine
- Monotonic clock
- Sleep/wake handling
- **No changes needed**

### ✅ Database Schema
- SQLite structure
- Sessions table
- Notes table
- History tracking

### ✅ UI/UX Design
- 280x280 → 360x360 bubble
- Progress ring
- Phase icons (eye, coffee mug)
- Expand-on-drag behavior
- Dot animations
- All spacing and proportions

### ✅ Feature Set
- Timer controls
- Presets
- Global hotkeys
- Notes capture
- System tray
- Position persistence

---

## What Changes

### Frontend Layer

**From:**
```dart
// Flutter + Dart
import 'package:flutter/material.dart';
import 'stub_engine.dart' as core;

Widget build(BuildContext context) {
  return Container(
    child: CircularProgressIndicator(...)
  );
}
```

**To:**
```typescript
// Electron + React + TypeScript
import React from 'react';
import { invoke } from './rust-bindings';

export const TimerBubble: React.FC = () => {
  return (
    <div className="timer-bubble">
      <CircularProgress />
    </div>
  );
};
```

### Rust Integration

**From:**
```rust
// flutter_rust_bridge
#[frb]
pub fn start_work(plan: PomodoroPlan) -> SessionSnapshot {
    // ...
}
```

**To:**
```rust
// neon-bindings OR keep FFI as-is
#[neon::export]
pub fn start_work(plan: PomodoroPlan) -> SessionSnapshot {
    // Same implementation
}

// OR use IPC (no code changes to core)
```

### Click-Through Implementation

**From:**
```dart
// Flutter (didn't work)
static const platform = MethodChannel('windows_click_through');
await platform.invokeMethod('setClickThrough', {'enabled': true});
// ❌ Crashes
```

**To:**
```typescript
// Electron (works reliably)
import { BrowserWindow } from 'electron';

win.setIgnoreMouseEvents(true, { forward: true });
// ✅ Works perfectly
```

---

## Migration Steps

### Step 1: Archive Flutter Work
```bash
git checkout -b electron-migration
mv app app-flutter-archived
git add .
git commit -m "Archive Flutter implementation before Electron migration"
```

### Step 2: Create Electron Project
```bash
mkdir electron-app && cd electron-app
npm init -y
npm install electron typescript react react-dom
npm install -D electron-builder @types/react @types/react-dom
```

### Step 3: Validate Click-Through
Create minimal `main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';

app.on('ready', () => {
  const win = new BrowserWindow({
    width: 280,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
  });
  
  // TEST: Enable click-through
  win.setIgnoreMouseEvents(true, { forward: true });
  
  win.loadFile('index.html');
});
```

**Success Criteria:** Can click through window to apps below. ✅

### Step 4: Port UI Components
Recreate Flutter UI in React:
- Timer bubble component
- Progress ring (SVG or Canvas)
- Control buttons
- Phase icons
- Dot animations

### Step 5: Integrate Rust Core
Choose approach:
- **Option A:** `neon-bindings` (native Node addon)
- **Option B:** IPC with separate Rust process
- **Option C:** Keep existing FFI, call from Electron main process

### Step 6: Port Features
- Global hotkeys
- System tray
- Position persistence
- Notes panel
- Database integration

### Step 7: Testing & Polish
- Manual testing checklist
- Unit tests for Rust core
- UI polish to match design
- Performance optimization

---

## Timeline

**Estimated: 12-18 days for MVP**

- Week 1: Foundation + Click-Through Validation (3-5 days)
- Week 2: Core Features + UI (4-6 days)
- Week 3: Additional Features + Polish (5-7 days)

**Target MVP Date:** End of October 2025

---

## Risk Mitigation

### Risk: Rust Integration Complexity
- **Mitigation:** Start with IPC (simpler, no native bindings)
- **Fallback:** Rewrite Pomodoro engine in TypeScript (not ideal but functional)

### Risk: UI Recreation Time
- **Mitigation:** Use Flutter screenshots as exact reference
- **Mitigation:** CSS Grid + Flexbox for precise layout
- **Mitigation:** Reuse exact pixel values from Flutter code

### Risk: Performance
- **Mitigation:** Electron uses Chromium (fast rendering)
- **Mitigation:** Request animation frame for smooth updates
- **Mitigation:** Offload work to Rust core (already done)

### Risk: Bundle Size
- **Mitigation:** Tree-shaking with Vite/Webpack
- **Mitigation:** ASAR packaging
- **Mitigation:** Still <100MB for full installer

---

## Benefits of This Decision

1. **Guarantees Core Feature:** Click-through will work reliably
2. **Faster Development:** No more platform channel debugging
3. **Better DX:** Chrome DevTools, hot reload, familiar stack
4. **Proven Stack:** Electron is production-ready for desktop apps
5. **Future-Proof:** Easier to add features (menu bar, notifications, etc.)
6. **Keep Best Parts:** Rust core remains unchanged

---

## Conclusion

This migration is **essential** to deliver the core product vision. The Flutter implementation taught us:
- What the UI should look like ✅
- How the Rust core should work ✅
- What features are needed ✅
- That click-through is non-negotiable ✅

Now we can build the **right** foundation with Electron and deliver a truly non-intrusive productivity app.

---

*Approved: 2025-10-11*
*Next Action: Begin Step 1 (Archive Flutter)*

