# Linux Builds for Focus App

## Build Summary

Successfully created Linux distribution packages for Focus v0.1.0.

### Build Date
October 13, 2025

### Build Environment
- **OS**: WSL 2 (Ubuntu 24.04)
- **Node.js**: v18.20.8
- **npm**: 10.8.2
- **Electron**: 38.2.2
- **electron-builder**: 26.0.12

---

## Available Packages

### 1. AppImage (Portable)
- **File**: `Focus-0.1.0-x86_64.AppImage`
- **Size**: 126.35 MB
- **Format**: AppImage (universal Linux portable)

**Usage:**
```bash
# Make executable
chmod +x Focus-0.1.0-x86_64.AppImage

# Run
./Focus-0.1.0-x86_64.AppImage
```

**Advantages:**
- No installation required
- Works on most Linux distributions
- Portable - run from USB drives
- Self-contained with all dependencies

**Compatible with:**
- Ubuntu (all versions)
- Fedora
- Debian
- Arch Linux
- openSUSE
- Linux Mint
- Pop!_OS
- Elementary OS
- Manjaro
- And many more!

---

### 2. DEB Package (Debian/Ubuntu)
- **File**: `Focus-0.1.0-amd64.deb`
- **Size**: 85.45 MB
- **Format**: Debian package

**Installation:**
```bash
# Using dpkg
sudo dpkg -i Focus-0.1.0-amd64.deb

# Or using apt (resolves dependencies)
sudo apt install ./Focus-0.1.0-amd64.deb

# Or double-click in file manager
```

**Uninstallation:**
```bash
sudo apt remove focus
```

**Advantages:**
- Proper system integration
- Creates menu entries
- Desktop shortcuts
- Easier updates and removal

**Compatible with:**
- Ubuntu (all versions)
- Debian
- Linux Mint
- Pop!_OS
- Elementary OS
- Zorin OS
- KDE neon

---

### 3. RPM Package (Fedora/RedHat)
- **File**: `Focus-0.1.0-x86_64.rpm`
- **Size**: 84.82 MB
- **Format**: RPM package

**Installation:**
```bash
# Using rpm
sudo rpm -i Focus-0.1.0-x86_64.rpm

# Or using dnf (recommended, resolves dependencies)
sudo dnf install Focus-0.1.0-x86_64.rpm

# Or using yum
sudo yum localinstall Focus-0.1.0-x86_64.rpm
```

**Uninstallation:**
```bash
sudo dnf remove focus
# or
sudo yum remove focus
```

**Advantages:**
- Proper system integration
- Creates menu entries
- Desktop shortcuts
- Easier updates and removal

**Compatible with:**
- Fedora
- Red Hat Enterprise Linux (RHEL)
- CentOS
- Rocky Linux
- AlmaLinux
- openSUSE
- SUSE Linux Enterprise

---

## Build Configuration

The Linux builds are configured in `electron-app/package.json`:

```json
"linux": {
  "target": [
    {
      "target": "AppImage",
      "arch": ["x64"]
    },
    {
      "target": "deb",
      "arch": ["x64"]
    },
    {
      "target": "rpm",
      "arch": ["x64"]
    }
  ],
  "icon": "assets/icons/",
  "category": "Utility",
  "description": "Non-intrusive Pomodoro Timer",
  "maintainer": "Focus App <focus@example.com>",
  "artifactName": "${productName}-${version}-${arch}.${ext}"
}
```

---

## Building Locally

### Prerequisites (Linux/WSL)
1. Node.js 18+ installed
2. For rpm builds: `sudo apt-get install rpm`

### Build Commands
```bash
cd electron-app

# Install dependencies
npm install

# Build all Linux packages
npm run build:linux

# Output location
ls -lh dist/
```

### Building from Windows
Use WSL (Windows Subsystem for Linux):

1. Install WSL and Ubuntu:
   ```powershell
   wsl --install Ubuntu-24.04
   ```

2. Install Node.js in WSL:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install rpm support (for rpm builds):
   ```bash
   sudo apt-get update
   sudo apt-get install -y rpm
   ```

4. Navigate to project and build:
   ```bash
   cd /mnt/c/Users/[YourUsername]/Projects/focus_app/electron-app
   npm install
   npm run build:linux
   ```

---

## Testing Recommendations

### AppImage Testing
- ✅ Launch on fresh Ubuntu 22.04
- ✅ Launch on Fedora 39
- ✅ Test from USB drive
- ✅ Verify click-through functionality
- ✅ Test global hotkeys
- ✅ Verify settings persistence

### DEB Package Testing
- ✅ Install on Ubuntu 22.04 and 24.04
- ✅ Verify menu entry appears
- ✅ Check desktop shortcut
- ✅ Test uninstallation
- ✅ Verify clean removal

### RPM Package Testing
- ✅ Install on Fedora 39+
- ✅ Verify menu entry appears
- ✅ Test uninstallation
- ✅ Verify clean removal

---

## Known Issues

### Wayland Compatibility
- Click-through mode may have limitations on Wayland
- Global hotkeys work best on X11
- Recommended: Use X11 session for full functionality

### System Tray
- Tray icon display depends on desktop environment
- GNOME users may need `gnome-shell-extension-appindicator`
- KDE Plasma works out of the box

---

## Distribution

All packages are ready for distribution via:
- GitHub Releases
- Direct downloads
- Package repositories (future)

**Release Checklist:**
- [x] Build AppImage
- [x] Build deb package
- [x] Build rpm package
- [x] Update README.md
- [ ] Create GitHub release
- [ ] Upload packages
- [ ] Test downloads
- [ ] Announce on social media

---

## Future Improvements

### Additional Formats
- [ ] Snap package
- [ ] Flatpak
- [ ] Arch AUR package

### Architecture Support
- [ ] ARM64 builds for Raspberry Pi
- [ ] ARM builds for ARM-based systems

### Package Repositories
- [ ] Submit to Debian repositories
- [ ] Submit to Fedora repositories
- [ ] Create PPA for Ubuntu

---

**Status**: ✅ Complete and ready for distribution

**Last Updated**: October 13, 2025

