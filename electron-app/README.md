# Focus Bubbles - Electron App

Non-intrusive Pomodoro timer with click-through functionality.

## Features ✨

### Current (Implemented)
- ✅ **Click-through window** - Interact with apps below the timer
- ✅ **Timer UI** - Beautiful circular progress timer with visual feedback
- ✅ **Timer controls** - Start, pause, reset functionality
- ✅ **Global hotkeys** - Control the app from anywhere
- ✅ **Position persistence** - Window remembers its position
- ✅ **System tray** - Runs in background with tray menu
- ✅ **Rust core integration** (stub) - Pomodoro logic in Rust

### Hotkeys

- `ALT+SHIFT+P` - Toggle window visibility
- `ALT+SHIFT+C` - Toggle click-through mode
- `ALT+SHIFT+S` - Screenshot/Quick note (TODO)
- `ALT+SHIFT+N` - Open notes panel (TODO)

### Planned
- ⏳ **Native Rust core** - Compile Neon addon for production
- ⏳ **Notes capture** - Quick notes with screenshots
- ⏳ **Statistics** - Track focus sessions over time
- ⏳ **Settings panel** - Customize durations and behavior
- ⏳ **Desktop notifications** - Alerts when phases complete

## Project Structure

```
electron-app/
├── main.js              # Electron main process
├── renderer.js          # UI logic and state management
├── index.html           # HTML structure
├── styles.css           # Styling and animations
├── core_stub.js         # Rust core stub (temporary)
├── native/              # Neon/Rust native addon (in progress)
│   ├── Cargo.toml
│   └── src/lib.rs
└── package.json
```

## Development

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Rust and Cargo (for native addon, optional for now)

### Quick Start

```bash
cd electron-app
npm install
npm start
```

The app will launch with DevTools attached for debugging.

### Testing Click-Through

1. Launch the app: `npm start`
2. Wait 500ms for click-through to auto-enable
3. Try clicking on desktop icons or apps behind the timer
4. Use `ALT+SHIFT+C` to toggle click-through on/off

### Window Position

The app remembers its position. To reset:
- Right-click the system tray icon → "Reset Position"
- Or manually delete the config file (see electron-store docs)

## Building the Native Rust Core

**Current Status:** The app uses a JavaScript stub (`core_stub.js`) that mimics the Rust core API. This works perfectly for development and testing.

**To build the native Neon addon (optional):**

1. Install Rust and Cargo
2. Install `cargo-cp-artifact`:
   ```bash
   cargo install cargo-cp-artifact
   ```
3. Build the native module:
   ```bash
   cd native
   cargo build --release
   ```
4. Update `renderer.js` to use the native module instead of `core_stub.js`

## System Tray

The app runs in the system tray with the following menu:

- **Show/Hide** - Toggle window visibility
- **Toggle Click-Through** - Enable/disable click-through
- **Reset Position** - Center the window
- **Quit** - Exit the app

**Note:** Double-click the tray icon to show/hide the window.

## Configuration

Position and settings are stored using `electron-store` in:
- Windows: `%APPDATA%\focus-bubbles-electron\config.json`
- macOS: `~/Library/Application Support/focus-bubbles-electron/config.json`
- Linux: `~/.config/focus-bubbles-electron/config.json`

## Troubleshooting

### Click-through not working
- Press `ALT+SHIFT+C` to manually enable it
- Check DevTools console for error messages
- Restart the app

### Window is missing
- Use `ALT+SHIFT+P` to toggle visibility
- Or use the system tray → "Show/Hide"
- Or use the tray menu → "Reset Position"

### Timer not counting down
- Check DevTools console for Rust core errors
- The stub implementation should work without Rust
- Ensure the timer is started (not paused)

## Contributing

This is a migration from Flutter to Electron. The core Pomodoro logic is written in Rust for performance and shared code.

### Next Steps
1. Build and integrate the native Neon addon
2. Implement settings panel
3. Add notes capture with screenshot
4. Implement desktop notifications
5. Add statistics and history tracking

## License

MIT

