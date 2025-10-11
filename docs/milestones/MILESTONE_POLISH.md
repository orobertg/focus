# Milestone: Quick Polish Sprint 🎨

**Sprint Name:** Quick Polish  
**Priority:** HIGH ⭐  
**Estimated Time:** 1-2 days  
**Status:** 📋 READY TO START  
**Start Date:** October 11, 2025  
**Target Completion:** October 12-13, 2025

---

## 🎯 Sprint Goal

Transform the functional Electron app into a **polished, production-ready application** by completing the remaining UI/UX features and fixing outstanding issues. This sprint focuses on quick wins that have high user impact.

---

## 📋 Sprint Backlog

### Task 1: Create Proper App Icon ⭐
**Priority:** HIGH | **Time Estimate:** 1-2 hours

#### Description
Convert the existing `icon.svg` to proper PNG formats for Windows application icon and system tray.

#### Acceptance Criteria
- [ ] PNG icons generated at multiple sizes:
  - [ ] 16×16 (small tray icon)
  - [ ] 32×32 (standard tray icon)
  - [ ] 48×48 (Windows taskbar)
  - [ ] 256×256 (application icon)
  - [ ] 512×512 (high-DPI)
- [ ] Icons properly integrated into Electron app
- [ ] App icon displays in taskbar
- [ ] Tray icon displays in system tray
- [ ] Icon matches brand (yellow ring on dark background)

#### Implementation Steps
1. Use online SVG-to-PNG converter or `sharp` npm package
2. Create `electron-app/assets/icons/` directory
3. Generate all required sizes
4. Update `main.js` to use proper icon paths:
   ```javascript
   icon: path.join(__dirname, 'assets/icons/icon-256.png')
   ```
5. Update tray icon creation with proper image
6. Test on Windows (different DPI settings)

#### Files to Modify
- `electron-app/main.js`
- New: `electron-app/assets/icons/*.png`

---

### Task 2: Fix electron-store TypeError ⚠️
**Priority:** MEDIUM | **Time Estimate:** 30 minutes

#### Description
Resolve the "Store is not a constructor" error that appears on app startup. App works but logs error.

#### Acceptance Criteria
- [ ] No console errors on app startup
- [ ] Position persistence still works
- [ ] Clean console output

#### Implementation Steps
1. Check `electron-store` version in `package.json`
2. Option A: Downgrade to stable version (v8.x)
   ```bash
   npm install electron-store@8
   ```
3. Option B: Fix import pattern:
   ```javascript
   // Current (broken):
   const Store = require('electron-store');
   
   // Fix:
   const { default: Store } = require('electron-store');
   // OR
   import Store from 'electron-store';
   ```
4. Test app startup
5. Verify position saving/loading

#### Files to Modify
- `electron-app/main.js`
- `electron-app/package.json` (if downgrading)

---

### Task 3: Implement Settings Panel 🎨
**Priority:** HIGH | **Time Estimate:** 3-4 hours

#### Description
Create a modal or separate window for user preferences (work duration, break duration, notifications).

#### Acceptance Criteria
- [ ] Settings accessible via button in timer (gear icon)
- [ ] Modal/window displays with current settings
- [ ] User can modify:
  - [ ] Work duration (default: 25 minutes)
  - [ ] Short break duration (default: 5 minutes)
  - [ ] Long break duration (default: 15 minutes)
  - [ ] Cycles before long break (default: 4)
  - [ ] Sound notifications (on/off)
- [ ] Settings persist via `electron-store`
- [ ] Settings apply immediately to timer
- [ ] Cancel/Save buttons functional
- [ ] Clean, professional UI matching timer aesthetic

#### Implementation Steps
1. Create `electron-app/settings.html`
2. Create `electron-app/settings.css`
3. Create `electron-app/settings.js`
4. Add settings window creation in `main.js`
5. Implement settings form with inputs
6. Add save/cancel handlers
7. Store settings in `electron-store`
8. Load settings on app start
9. Apply settings to `core_stub.js` timer durations

#### UI Design
```
┌─────────────────────────────────┐
│  Focus Bubbles - Settings       │
├─────────────────────────────────┤
│                                 │
│  Work Duration:     [25] min    │
│  Short Break:       [ 5] min    │
│  Long Break:        [15] min    │
│  Cycles:            [ 4]        │
│                                 │
│  Notifications:     [x] Enabled │
│  Sound:             [x] Beep    │
│                                 │
│      [Cancel]  [Save Changes]   │
│                                 │
└─────────────────────────────────┘
```

#### Files to Create/Modify
- New: `electron-app/settings.html`
- New: `electron-app/settings.css`
- New: `electron-app/settings.js`
- Modify: `electron-app/main.js` (settings window)
- Modify: `electron-app/renderer.js` (load settings, handle gear button)
- Modify: `electron-app/core_stub.js` (accept custom durations)

---

### Task 4: Add Timer Presets to Toolbar 🔢
**Priority:** HIGH | **Time Estimate:** 2 hours

#### Description
Add preset buttons to toolbar for quick timer configuration (25/5, 50/10, custom).

#### Acceptance Criteria
- [ ] Toolbar displays preset buttons
- [ ] "25/5" button sets 25min work, 5min break
- [ ] "50/10" button sets 50min work, 10min break
- [ ] "Custom" button opens settings panel
- [ ] Active preset is visually indicated
- [ ] Clicking preset resets timer to idle state with new durations
- [ ] Toolbar size adjusts if needed (or buttons replace existing ones)

#### Implementation Steps
1. Update `toolbar.html` to add preset buttons
2. Update `toolbar.css` for new button styles
3. Add preset button handlers in `toolbar.js`
4. Send IPC message to main window with preset data
5. Implement preset handler in `renderer.js`
6. Update `core_stub.js` to accept custom durations
7. Visual feedback for active preset

#### UI Design
```
┌──────────────────────────────────────┐
│  [▶]  [■]  │  [25/5]  [50/10]  [⚙]  │
└──────────────────────────────────────┘
```

#### Files to Modify
- `electron-app/toolbar.html`
- `electron-app/toolbar.css`
- `electron-app/toolbar.js`
- `electron-app/main.js` (IPC handler)
- `electron-app/renderer.js` (preset application)
- `electron-app/core_stub.js` (accept durations)

---

### Task 5: Implement Extend +5 Button ⏱️
**Priority:** MEDIUM | **Time Estimate:** 1 hour

#### Description
Add a button to extend the current phase by 5 minutes without resetting progress.

#### Acceptance Criteria
- [ ] "+5" button appears in timer controls
- [ ] Only enabled during active timer (disabled when idle)
- [ ] Adds 5 minutes to current phase
- [ ] Progress ring updates correctly
- [ ] Can be clicked multiple times
- [ ] Visual feedback on click

#### Implementation Steps
1. Add extend button to `index.html` (near settings button)
2. Style button in `styles.css`
3. Add `extendWork()` function to `core_stub.js`
4. Implement handler in `renderer.js`
5. Update UI after extension
6. Disable/enable button based on timer state

#### UI Position
```
┌─────────────────────────────────┐
│         [progress ring]         │
│                                 │
│  [↻]  [START]  [+5]  [⚙]       │
└─────────────────────────────────┘
```

#### Files to Modify
- `electron-app/index.html`
- `electron-app/styles.css`
- `electron-app/renderer.js`
- `electron-app/core_stub.js`

---

### Task 6: Add Sound Notifications 🔊
**Priority:** LOW | **Time Estimate:** 1 hour

#### Description
Play a subtle sound when timer completes a phase (optional, configurable in settings).

#### Acceptance Criteria
- [ ] Sound plays when work phase completes
- [ ] Sound plays when break completes
- [ ] Can be disabled in settings
- [ ] Sound is subtle and non-intrusive
- [ ] Works on all Windows versions

#### Implementation Steps
1. Find/create subtle beep sound (MP3 or WAV)
2. Add sound file to `electron-app/assets/sounds/`
3. Use Web Audio API or HTML5 Audio
4. Play sound in `renderer.js` when phase completes
5. Check settings before playing
6. Test volume levels

#### Files to Create/Modify
- New: `electron-app/assets/sounds/notification.mp3`
- Modify: `electron-app/renderer.js`

---

## 🎯 Sprint Success Criteria

At the end of this sprint, the app should:

1. ✅ **Look Professional**
   - Proper app icon in taskbar and tray
   - No console errors
   - Clean, polished UI

2. ✅ **Be Configurable**
   - Users can set custom durations
   - Quick access to common presets (25/5, 50/10)
   - Sound notifications optional

3. ✅ **Be User-Friendly**
   - Settings are easy to find and modify
   - Extend functionality for flexibility
   - Presets for quick setup

4. ✅ **Be Production-Ready**
   - No major bugs or errors
   - All core features functional
   - Ready for daily use

---

## 📊 Definition of Done

Each task is "done" when:
- [ ] Code implemented and tested
- [ ] All acceptance criteria met
- [ ] No console errors introduced
- [ ] App runs smoothly without crashes
- [ ] Changes committed to git
- [ ] Screenshot/demo captured (if UI change)

Sprint is "done" when:
- [ ] All 6 tasks completed
- [ ] Full regression test passed
- [ ] README.md updated with new features
- [ ] Demo video or screenshots created
- [ ] Ready to tag as v0.2.0

---

## 🧪 Testing Checklist

After completing sprint, test:

- [ ] App starts without errors
- [ ] Icon displays properly in taskbar and tray
- [ ] Settings panel opens and saves correctly
- [ ] Presets apply and timer resets
- [ ] Extend +5 adds time correctly
- [ ] Sound plays when enabled (and doesn't when disabled)
- [ ] All existing features still work:
  - [ ] Timer start/pause/reset
  - [ ] Progress ring animation
  - [ ] Pause/break dots
  - [ ] Toolbar communication
  - [ ] Global hotkeys
  - [ ] Click-through toggle
  - [ ] Position persistence
  - [ ] Dragging both windows

---

## 🚀 Post-Sprint Next Steps

After this sprint is complete:

### Option B: Database Sprint
- SQLite integration
- Session persistence
- History tracking

### Option C: Rust Core Sprint
- Native Rust module via neon-bindings
- Replace JavaScript stub
- Performance optimization

### Or: Ship v0.2.0!
- Package as Windows installer
- Create release notes
- Start using in production

---

## 📝 Notes & Decisions

### Design Decisions
- Using modal for settings (simpler than separate window)
- Presets in toolbar (quick access)
- Sound notifications opt-in (default off)

### Technical Decisions
- Stick with pure HTML/CSS/JS (no React needed yet)
- electron-store for all persistence (including settings)
- JavaScript stub sufficient for now (Rust core later)

### Out of Scope
- Database integration (next sprint)
- Notes capture (next sprint)
- Statistics dashboard (future)
- Native Rust core (future)

---

*Sprint Created: October 11, 2025*  
*Last Updated: October 11, 2025*

