# Focus Bubbles - Testing Checklist

## 🧪 **Testing Instructions for Current Build**

### **Basic Timer Functionality**
- [ ] **App launches successfully** - Floating bubble appears on screen
- [ ] **Default state** - Shows "--:--" when idle
- [ ] **Play button** - Click center play button, timer should start at 25:00
- [ ] **Pause button** - Click again to pause, timer should freeze
- [ ] **Resume** - Click again to resume from paused time
- [ ] **Timer countdown** - Verify timer counts down correctly (check console for "Timer tick" logs)

### **Preset Buttons (Toolbar)**
- [ ] **25/5 preset** - Click "25/5" button, should start 25-minute work session
- [ ] **50/10 preset** - Click "50/10" button, should start 50-minute work session
- [ ] **Stop button** - Click "Stop", should reset to idle state

### **Timer Controls**
- [ ] **Skip button** - During work session, click skip (⏭️ icon), should advance to break
- [ ] **Extend button** - During work session, click extend (+), should add 5 minutes
- [ ] **Phase transitions** - Let a short timer complete (or use 1/1 preset if available), should auto-advance to break

### **UI Interaction**
- [ ] **Draggable bubble** - Click and drag the circular bubble, it should move
- [ ] **Draggable toolbar** - Click and drag the toolbar, it should move independently
- [ ] **Always on top** - Minimize other windows, bubble should stay visible

### **Position Persistence**
- [ ] **Save positions** - Drag bubble and toolbar to new positions
- [ ] **Restart app** - Close and reopen the app (use tray icon "Quit" or Alt+F4)
- [ ] **Verify restore** - Bubble and toolbar should appear at saved positions

### **Global Hotkeys**
- [ ] **ALT+SHIFT+P** - Press while app is visible, should hide window
- [ ] **ALT+SHIFT+P again** - Press while hidden, should show and focus window
- [ ] **ALT+SHIFT+S** - Press, should see console message "screenshot feature (coming soon)"
- [ ] **Unfocused test** - Click another window, then try hotkeys - should still work

### **Tray Icon**
- [ ] **Tray icon visible** - Check system tray for app icon
- [ ] **Right-click menu** - Should show "Start" and "Quit" options
- [ ] **Start from tray** - Click "Start", should begin timer
- [ ] **Quit from tray** - Click "Quit", app should close

### **Console Debugging**
Watch the console output for:
- ✅ `Global hotkeys registered: ALT+SHIFT+P (toggle panel), ALT+SHIFT+S (screenshot)`
- ✅ `Timer tick: RunState.running, [elapsed]/[total]`
- ✅ `Rust: start_work called with plan: ...`
- ✅ `Rust: snapshot with session - ...`

### **Known Issues / Expected Behavior**
- Timer updates every 250ms (4 times per second)
- Console shows Rust debug prints for all timer operations
- Phase auto-advance happens when timer reaches 0
- Positions save when you finish dragging (onPanEnd)

---

## 🐛 **If You Encounter Issues**

### App won't start
- Check console for FFI initialization errors
- Verify `focus_core.dll` exists in `core/target/release/`

### Timer not counting down
- Check console for "Timer tick" messages
- Verify Rust prints show "snapshot with session"
- Try clicking a preset button instead of play button

### Hotkeys not working
- Check console for "Global hotkeys registered" message
- Verify no other app is using ALT+SHIFT+P or ALT+SHIFT+S
- Try running as administrator if needed

### Positions not saving
- Check if `shared_preferences` initialized correctly
- Verify you're dragging and releasing (not just clicking)

---

## 📊 **What to Report Back**

Please test the items above and let me know:
1. ✅ What works as expected
2. ❌ What doesn't work or behaves unexpectedly
3. 💡 Any suggestions or observations
4. 📋 Console output if there are errors

**Most Important Tests:**
1. Can you start and pause the timer?
2. Does the countdown work?
3. Do the preset buttons work?
4. Do global hotkeys work when window is unfocused?

---

*Testing Version: MVP Build with Rust Core Integration*
*Date: October 11, 2025*

