# Focus v0.1.0 - Initial Release 🎉

**Release Date:** October 13, 2025  
**Status:** Production Ready  
**Platforms:** Windows (macOS coming soon)

---

## 🎯 What is Focus?

Focus is a **non-intrusive Pomodoro timer** that helps you stay productive without getting in your way. The unique **click-through** feature lets you see your timer while interacting with apps behind it—perfect for coding, writing, or any focused work.

---

## ✨ Highlights

### 🪟 Click-Through Magic
- First Pomodoro timer with **true click-through** functionality
- Stay visible without blocking your work
- Toggle with **ALT+SHIFT+C**

### ⏱️ Full Pomodoro Implementation
- Classic 25/5 timer (customizable 1-120 min)
- Automatic breaks with visual progress
- 4 Pomodoros → Long break cycle
- Reflection period after completing cycles

### 🎨 Beautiful & Minimal UI
- Floating timer bubble with progress ring
- Color-coded phase indicators
- Smooth animations
- Dark theme optimized for focus

### 🔔 Smart Notifications
- Pleasant audio tones (not harsh beeps!)
- Windows desktop notifications
- Test sound button included
- Fully customizable

---

## 📥 Downloads

### Windows

**Choose your preferred installation method:**

| File | Size | Description |
|------|------|-------------|
| **Focus-0.1.0-Setup.exe** | 91 MB | Full installer with shortcuts |
| **Focus-0.1.0-Portable.exe** | 91 MB | No installation required |

**Installation:**
1. Download your preferred version above
2. Run the executable
3. (Installer only) Follow setup wizard
4. Launch Focus!

**First Launch:**
- Timer appears on screen
- Toolbar window provides controls
- System tray icon in taskbar
- Press ALT+SHIFT+O to open settings

---

## 🚀 Key Features

### Timer Features
- ✅ **Pomodoro Timer** - 25 min work, 5 min break (customizable)
- ✅ **Visual Progress** - Ring, dots, and phase icons
- ✅ **Timer Presets** - Quick 25/5 or 50/10 setup
- ✅ **Extend +5** - Add time to current session
- ✅ **Auto-Start** - Optional automatic transitions

### Window Features
- ✅ **Click-Through Mode** - Work through your timer
- ✅ **Always Visible** - Stays on top (optional)
- ✅ **Draggable** - Position anywhere on screen
- ✅ **Position Memory** - Remembers location

### Notifications
- ✅ **Sound Alerts** - Musical tones for phase changes
- ✅ **Desktop Toasts** - Windows notifications
- ✅ **Test Sounds** - Preview before committing
- ✅ **Fully Optional** - Toggle in settings

### System Integration
- ✅ **Global Hotkeys** - ALT+SHIFT+P/C/O
- ✅ **System Tray** - Background operation
- ✅ **Single Instance** - Only one timer at a time
- ✅ **Settings Persistence** - All preferences saved

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **ALT+SHIFT+P** | Show/hide windows |
| **ALT+SHIFT+C** | Toggle click-through |
| **ALT+SHIFT+O** | Open settings |

---

## ⚙️ Settings

### Duration Tab
- Work session: 1-120 minutes (default: 25)
- Short break: 1-30 minutes (default: 5)
- Long break: 5-60 minutes (default: 15)
- Cycle length: 1-10 Pomodoros (default: 4)

### Options Tab
- Auto-start breaks (default: enabled)
- Auto-start Pomodoros (default: disabled)
- Always on top (default: disabled)

### Notifications Tab
- Sound notifications (default: enabled)
- Desktop notifications (default: enabled)
- Test sound button

---

## 🎨 What Makes Focus Special?

### 1. Non-Intrusive by Design
Unlike other timers that pop up and block your screen, Focus uses click-through technology to stay visible without interrupting your workflow.

### 2. Beautiful & Minimal
Clean, modern interface that enhances rather than distracts. Every pixel serves a purpose.

### 3. Flexible Workflow
Auto-start breaks for hands-free operation, or manual control for total flexibility. Timer presets for quick setup. Extend button for "just 5 more minutes."

### 4. Professional Quality
Production-ready with installers, system tray integration, global hotkeys, and persistent settings. Built to the same quality standards as commercial apps.

---

## 📊 Technical Details

**Built With:**
- Electron 38.2.2
- Node.js 18+
- HTML5 + CSS3 + JavaScript
- electron-store (settings)
- electron-builder (packaging)

**Performance:**
- Memory: ~90-100 MB
- CPU: < 1% when idle
- Startup: 1-2 seconds
- Timer accuracy: 250ms ticks

**Distribution:**
- NSIS installer with uninstaller
- Portable executable
- Single-instance enforcement
- Settings in AppData

---

## 🐛 Known Issues

### Windows SmartScreen Warning
**Issue:** Windows may show "Windows protected your PC"  
**Why:** App is unsigned (no code signing certificate yet)  
**Solution:** Click "More info" → "Run anyway"  
**Safe:** This is a false positive - code is open source

### Multiple Instances
**Issue:** Multiple Focus processes in Task Manager  
**Solution:** Fixed in this release! Only one instance can run now  
**How:** Single-instance lock + app ID enforcement

---

## 🗺️ What's Next?

### Coming in Future Releases

**v0.2.0 - Database & History**
- Session tracking and history
- Statistics dashboard
- Focus time analytics

**v0.3.0 - Native Performance**
- Rust core for better accuracy
- Reduced battery usage
- Faster startup

**v0.4.0 - Advanced Features**
- Notes capture with screenshots
- Multiple timer profiles
- Custom themes

**v1.0.0 - Production Polish**
- Code signing (no more warnings!)
- Auto-update mechanism
- Mac App Store distribution

---

## 🤝 Contributing

Love Focus? Here's how to help:

- ⭐ **Star the repo** - Show your support
- 🐛 **Report bugs** - Help us improve
- 💡 **Suggest features** - Share your ideas
- 📢 **Spread the word** - Tell your friends
- 💻 **Submit PRs** - Contribute code

---

## 📄 License

**MIT License** - Free to use, modify, and distribute.

---

## 🙏 Thank You!

Special thanks to:
- Francesco Cirillo for the Pomodoro Technique
- Electron team for the amazing framework
- Early testers for valuable feedback
- You for trying Focus! 🎯

---

## 🔗 Links

- **Repository:** https://github.com/YOUR_USERNAME/focus_app
- **Issues:** https://github.com/YOUR_USERNAME/focus_app/issues
- **Discussions:** https://github.com/YOUR_USERNAME/focus_app/discussions
- **Documentation:** https://github.com/YOUR_USERNAME/focus_app/tree/main/docs

---

## ⚡ Quick Start

```bash
# Download and install Focus
# Launch the app
# Press ALT+SHIFT+O to open settings
# Click play to start your first Pomodoro
# Focus on your work!
```

**That's it!** Focus is designed to be simple to start using, with power features available when you need them.

---

**Built with focus, for focus.** 🎯

**Enjoy your productivity!**

---

*Release v0.1.0 - October 13, 2025*

