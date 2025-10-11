# Testing Guide - Focus Bubbles Electron

## Quick Test (2 minutes)

### 1. Start the App
```bash
cd electron-app
npm start
```

### 2. Verify Window
- [ ] Circular timer window appears (280x280px)
- [ ] DevTools opens automatically
- [ ] Window is draggable
- [ ] Window stays on top

### 3. Test Click-Through
- [ ] Wait 500ms for auto-enable
- [ ] Try clicking desktop icons **through** the timer
- [ ] Try opening apps **below** the timer
- [ ] ✅ **SUCCESS if background apps respond to clicks!**

### 4. Test Timer
- [ ] Click "START" button
- [ ] Timer counts down (25:00 → 24:59...)
- [ ] Progress ring fills clockwise
- [ ] Phase icon shows open eye
- [ ] Click "PAUSE" button
- [ ] Timer stops counting
- [ ] Click "START" again to resume
- [ ] Click reset button (circular arrow) to reset

### 5. Test Hotkeys
- [ ] Press `ALT+SHIFT+P` → Window hides/shows
- [ ] Press `ALT+SHIFT+C` → Click-through toggles
- [ ] Check DevTools console for confirmation

### 6. Test System Tray
- [ ] Right-click tray icon
- [ ] Menu appears with options
- [ ] Click "Show/Hide" → Window toggles
- [ ] Double-click tray icon → Window toggles

### 7. Test Position Persistence
- [ ] Drag window to a corner
- [ ] Close app completely
- [ ] Restart app: `npm start`
- [ ] Window appears in same position ✅

---

## Comprehensive Test (10 minutes)

### Timer States

#### Idle State
- [ ] Default timer shows "25:00"
- [ ] Phase label shows "READY"
- [ ] Icon is closed eye (gray)
- [ ] Progress ring is gray
- [ ] Dots are empty
- [ ] Button says "START"

#### Running State (Focus)
- [ ] Click "START"
- [ ] Timer counts down
- [ ] Phase label shows "FOCUS"
- [ ] Icon is open eye
- [ ] Progress ring fills (red)
- [ ] Button says "PAUSE"

#### Paused State
- [ ] Click "PAUSE"
- [ ] Timer stops
- [ ] Phase label shows "PAUSE"
- [ ] Icon is closed eye (gray)
- [ ] Dots start filling (yellow, every 15s)
- [ ] Button says "START"

#### Break State (after 60s pause)
- [ ] Keep paused for 60 seconds
- [ ] Phase label changes to "BREAK"
- [ ] Icon changes to coffee mug (teal)
- [ ] All 4 dots are yellow
- [ ] Dots blink
- [ ] Progress ring turns teal

#### Cooldown (resume from break)
- [ ] Click "START" while in break
- [ ] Phase label shows "FOCUS"
- [ ] Yellow dots remain (not blinking)
- [ ] Dots turn off one by one (right to left, 15s intervals)
- [ ] After 60s, dots are all red/empty

### Edge Cases

#### Window Management
- [ ] Drag to screen edge → Window moves
- [ ] Drag to corner → Window stays visible
- [ ] Move off-screen → Still retrievable via tray

#### Click-Through Edge Cases
- [ ] Click-through ON, try to drag → Can't drag
- [ ] Press ALT+SHIFT+C → Click-through OFF
- [ ] Try to drag → Can drag ✅
- [ ] Press ALT+SHIFT+C → Click-through ON
- [ ] Try to click button → Can click ✅

#### Timer Edge Cases
- [ ] Start timer, let it run to 0:00
- [ ] Timer stops, phase label shows "READY"
- [ ] Dots show completed Pomodoro
- [ ] Reset while running → Timer resets
- [ ] Pause, then reset → Timer resets

### Performance

#### Resource Usage
- [ ] Open Task Manager
- [ ] Check CPU usage: Should be < 1% when idle
- [ ] Check Memory: Should be < 100MB
- [ ] Check GPU: Minimal usage

#### Responsiveness
- [ ] Click buttons → Immediate response
- [ ] Drag window → Smooth movement
- [ ] Hotkeys → Instant activation
- [ ] UI updates → Smooth animations

### Stability

#### Long Running
- [ ] Let app run for 5 minutes
- [ ] Complete a full Pomodoro (25 min)
- [ ] Use all controls multiple times
- [ ] Check DevTools for errors
- [ ] No crashes ✅

#### Stress Test
- [ ] Rapidly click Start/Pause 20 times
- [ ] Drag window around frantically
- [ ] Toggle click-through rapidly
- [ ] Toggle visibility rapidly
- [ ] App should remain stable ✅

---

## Bug Reporting

### If Something Doesn't Work

1. **Check DevTools Console**
   - Look for error messages
   - Note any red text

2. **Collect Information**
   - OS version (Windows/macOS/Linux)
   - Node version: `node --version`
   - Electron version: Check `package.json`
   - Steps to reproduce
   - Expected vs actual behavior

3. **Create Issue**
   - Provide all information above
   - Include screenshots if visual bug
   - Include console logs

---

## Known Limitations (Current)

### Not Yet Implemented
- ⏳ Settings panel (durations hardcoded)
- ⏳ Notes capture
- ⏳ Screenshot functionality
- ⏳ Statistics dashboard
- ⏳ Desktop notifications
- ⏳ Native Rust core (using stub)

### Platform-Specific
- **Windows:** Click-through works perfectly ✅
- **macOS:** Click-through should work (untested)
- **Linux:** Click-through should work (untested)

---

## Success Metrics

### Must Pass (Critical)
- ✅ Click-through works reliably
- ✅ Timer counts down correctly
- ✅ No crashes during normal use
- ✅ Global hotkeys respond
- ✅ Position persists across restarts

### Should Pass (Important)
- ✅ Smooth animations
- ✅ Minimal resource usage
- ✅ Fast startup time
- ✅ Clean UI with no artifacts
- ✅ System tray functional

### Nice to Have (Polish)
- ⏳ Native Rust core compiled
- ⏳ All settings configurable
- ⏳ Beautiful icons
- ⏳ Sound effects
- ⏳ Notifications

---

## Automated Testing (Future)

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

**Note:** Test suite not yet implemented

---

## Feedback

If everything works: ✅ **Electron migration is a success!**

If something breaks: 🐛 **Report it so we can fix it!**

---

**Happy Testing! 🎯**

