# Focus Bubbles - Electron Development Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Electron App                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────────────┐    │
│  │  Main        │         │  Renderer            │    │
│  │  Process     │◄────────┤  Process             │    │
│  │  (main.js)   │   IPC   │  (renderer.js)       │    │
│  └──────────────┘         └──────────────────────┘    │
│        │                            │                  │
│        │                            │                  │
│        ▼                            ▼                  │
│  ┌──────────────┐         ┌──────────────────────┐    │
│  │  Window      │         │  Rust Core           │    │
│  │  Management  │         │  (Neon/Native)       │    │
│  │  - Size      │         │  - Timer Logic       │    │
│  │  - Position  │         │  - State Mgmt        │    │
│  │  - Tray      │         │  - Persistence       │    │
│  └──────────────┘         └──────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Main Process (`main.js`)

**Responsibilities:**
- Create and manage the main window
- Handle click-through functionality
- Manage global shortcuts
- System tray integration
- Position persistence

**Key Functions:**
- `createWindow()` - Initialize main window with saved position
- `enableClickThrough()` / `disableClickThrough()` - Window transparency control
- `registerGlobalShortcuts()` - Set up ALT+SHIFT+* hotkeys
- `createTray()` - System tray icon and menu

### Renderer Process (`renderer.js`)

**Responsibilities:**
- Timer UI state management
- User interaction handling
- Rust core integration
- Visual updates and animations

**Key Functions:**
- `startTimer()` / `pauseTimer()` / `handleReset()` - Timer control
- `tick()` - 250ms update loop for smooth UI
- `updateUI()` - Render current state
- `updateStateFromSnapshot()` - Sync with Rust core

### UI Layer (`index.html` + `styles.css`)

**Components:**
- Circular progress ring (SVG)
- Timer display (MM:SS)
- Phase icon (eye/coffee mug)
- Progress dots (Pomodoro completion)
- Bottom controls (Reset, Start/Pause, Settings)

**Design Principles:**
- Dark, semi-transparent background
- Non-intrusive circular design
- Visual feedback for all interactions
- Smooth animations

### Rust Core (`native/src/lib.rs` or `core_stub.js`)

**Current:** JavaScript stub that mimics Rust API  
**Future:** Compiled Neon native addon

**API:**
- `startWork()` → SessionSnapshot
- `pauseTimer()` → SessionSnapshot
- `resumeTimer()` → SessionSnapshot
- `stopTimer()` → SessionSnapshot
- `getSnapshot()` → SessionSnapshot

**Data Structures:**
```rust
enum Phase { Work, ShortBreak, LongBreak }
enum RunState { Idle, Running, Paused }

struct SessionSnapshot {
    session_id: String,
    phase: Phase,
    run_state: RunState,
    millis_total: u64,
    millis_elapsed: u64,
    cycle_index: u8,
}
```

## State Management

### State Flow

```
User Action → Renderer → Rust Core → Snapshot → Update UI
     │                                              ▲
     └──────────────────────────────────────────────┘
              (Global Hotkey / Tray Click)
```

### State Synchronization

The renderer maintains a local state object that is synchronized with the Rust core via snapshots:

1. **User initiates action** (click Start button)
2. **Renderer calls Rust core** (`rustCore.startWork()`)
3. **Core returns JSON snapshot**
4. **Renderer updates local state** from snapshot
5. **UI updates** based on new state

This ensures the authoritative state lives in the Rust core, preventing drift.

## Click-Through Implementation

### How It Works

Electron provides `setIgnoreMouseEvents(ignore, options)`:

```javascript
// Enable click-through
mainWindow.setIgnoreMouseEvents(true, { forward: true });

// Disable click-through
mainWindow.setIgnoreMouseEvents(false);
```

**Key Points:**
- `forward: true` allows events to pass through to apps below
- Must be re-enabled after window regains focus
- Can be toggled with hotkeys for debugging

### Flutter vs Electron Click-Through

| Aspect | Flutter (Failed) | Electron (Success) |
|--------|------------------|-------------------|
| API | Custom platform channel + Win32 | Built-in `setIgnoreMouseEvents()` |
| Stability | Frequent crashes | Rock solid |
| Complexity | ~200 lines C++, complex lifecycle | 1 line JavaScript |
| Reliability | Unpredictable | 100% reliable |

## Planned Features

### Phase 1: Core Functionality (✅ DONE)
- [x] Timer UI with circular progress
- [x] Start/Pause/Reset controls
- [x] Click-through window
- [x] Global hotkeys
- [x] Position persistence
- [x] System tray
- [x] Rust core integration (stub)

### Phase 2: Native Performance
- [ ] Build and integrate Neon native addon
- [ ] Replace stub with compiled Rust
- [ ] Performance optimization

### Phase 3: Additional Features
- [ ] Settings panel (duration config)
- [ ] Notes capture with screenshot
- [ ] Desktop notifications
- [ ] Sound alerts (optional)

### Phase 4: Polish
- [ ] Statistics dashboard
- [ ] Session history
- [ ] Export data (CSV/JSON)
- [ ] Custom themes
- [ ] Tray icon with progress

## Building for Production

### Development Build

```bash
npm start
```

### Production Build (TODO)

```bash
npm run build
```

This will:
1. Build the native Rust addon (if available)
2. Package the Electron app for your platform
3. Create an installer/executable

## Testing Checklist

### Core Functionality
- [ ] Timer starts and counts down correctly
- [ ] Pause/Resume works
- [ ] Reset clears the timer
- [ ] Progress ring updates smoothly
- [ ] Phase icon changes (eye/coffee)

### Click-Through
- [ ] Click-through enables after 500ms
- [ ] Can interact with apps below
- [ ] ALT+SHIFT+C toggles click-through
- [ ] Window still draggable

### Global Hotkeys
- [ ] ALT+SHIFT+P toggles visibility
- [ ] ALT+SHIFT+C toggles click-through
- [ ] Hotkeys work when window hidden
- [ ] Hotkeys work from other apps

### System Tray
- [ ] Tray icon appears
- [ ] Right-click menu works
- [ ] Double-click shows/hides window
- [ ] Quit menu item works

### Position Persistence
- [ ] Window position saved on move
- [ ] Position restored on restart
- [ ] Reset Position menu works

## Debugging

### Enable Verbose Logging

All console.log statements are prefixed with `[Component]`:
- `[Electron]` - Main process
- `[Timer]` - Timer logic
- `[Core]` - Rust core
- `[Shortcut]` - Global hotkeys

### Common Issues

**Click-through stuck:**
```javascript
// In DevTools console:
require('electron').remote.getCurrentWindow().setIgnoreMouseEvents(false);
```

**Window position lost:**
```javascript
// Check stored config:
const Store = require('electron-store');
const store = new Store();
console.log(store.get('windowPosition'));
```

**Rust core not working:**
- Check if `core_stub.js` exists and is imported correctly
- Verify JSON parsing in `updateStateFromSnapshot()`

## Performance Considerations

### Update Frequency

- Timer tick: 250ms (4 Hz) - smooth enough, battery friendly
- UI updates: Triggered by tick only, no continuous animations
- Snapshot polling: Only when timer is running

### Memory Management

- Single window instance
- Minimal DOM (no heavy frameworks)
- Rust core handles state (no memory leaks)
- electron-store handles persistence efficiently

## Security

### Context Isolation

Currently disabled for simplicity:
```javascript
contextIsolation: false
```

**TODO:** Enable context isolation and use IPC for security:
- Renderer should not have direct Node.js access
- Communicate via `ipcRenderer` / `ipcMain`
- Preload script for API exposure

## Contributing

### Code Style

- ES6+ JavaScript
- Clear, descriptive variable names
- Comments for complex logic
- Console logging for debugging

### Commit Guidelines

- Use conventional commits
- Test before committing
- Update README/docs if needed

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Neon Bindings](https://neon-bindings.com/)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [flutter_rust_bridge](https://cjycode.com/flutter_rust_bridge/) (for reference)

## License

MIT

