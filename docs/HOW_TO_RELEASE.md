# How to Create a GitHub Release

This guide will help you publish Focus v0.1.0 on GitHub.

---

## 📋 Prerequisites

- ✅ GitHub repository created for Focus
- ✅ Code pushed to GitHub
- ✅ Installers built (in `electron-app/dist/`)
- ✅ README.md updated
- ✅ CHANGELOG.md created
- ✅ LICENSE file added

---

## 🚀 Steps to Create Release

### 1. Push All Changes to GitHub

```bash
# Make sure you're in the project root
cd C:\Users\orobe\Projects\focus_app

# Add all files
git add .

# Commit with a clear message
git commit -m "Release v0.1.0 - Initial production release"

# Push to GitHub
git push origin main
```

### 2. Create a Git Tag

```bash
# Create annotated tag for v0.1.0
git tag -a v0.1.0 -m "Release v0.1.0 - Initial Release"

# Push the tag to GitHub
git push origin v0.1.0
```

### 3. Create GitHub Release

**Via GitHub Web Interface:**

1. **Go to your repository** on GitHub
   - https://github.com/YOUR_USERNAME/focus_app

2. **Click "Releases"** (right sidebar)
   - Or go to: https://github.com/YOUR_USERNAME/focus_app/releases

3. **Click "Draft a new release"**

4. **Fill in Release Form:**
   
   **Tag version:** `v0.1.0`  
   **Release title:** `Focus v0.1.0 - Initial Release 🎉`
   
   **Description:** Copy content from `docs/RELEASE_NOTES_v0.1.0.md`

5. **Upload Assets:**
   
   Drag and drop these files from `electron-app/dist/`:
   - `Focus-0.1.0-Setup.exe` (91 MB)
   - `Focus-0.1.0-Portable.exe` (91 MB)

6. **Set as Latest Release:** ✅ Check this box

7. **Click "Publish release"**

---

## 📦 What to Upload

### Required Files

| File | Size | Platform | Type |
|------|------|----------|------|
| Focus-0.1.0-Setup.exe | 91 MB | Windows | Installer |
| Focus-0.1.0-Portable.exe | 91 MB | Windows | Portable |

### Optional Files (If Available)

| File | Platform | Type |
|------|----------|------|
| Focus-0.1.0-x64.dmg | macOS Intel | Installer |
| Focus-0.1.0-arm64.dmg | macOS Apple Silicon | Installer |
| Focus-0.1.0-x64.zip | macOS Intel | Archive |
| Focus-0.1.0-arm64.zip | macOS Apple Silicon | Archive |

---

## 📝 Release Notes Template

Here's what to include in your GitHub release description:

```markdown
## 🎯 What is Focus?

Focus is a non-intrusive Pomodoro timer with click-through functionality. Stay productive without interruption.

## ✨ Highlights

- 🪟 **Click-Through** - First Pomodoro timer with true click-through
- ⏱️ **Full Pomodoro** - 25/5 timer with automatic breaks
- 🎨 **Beautiful UI** - Minimal, elegant design
- 🔔 **Smart Notifications** - Sound + desktop alerts
- ⌨️ **Global Hotkeys** - ALT+SHIFT+P/C/O

## 📥 Download

**Windows:**
- Focus-0.1.0-Setup.exe - Full installer with shortcuts
- Focus-0.1.0-Portable.exe - No installation required

**macOS:** Coming soon! 🍎

## 🚀 Quick Start

1. Download and install
2. Press ALT+SHIFT+O for settings
3. Click play to start
4. Focus on your work!

## ⌨️ Keyboard Shortcuts

- **ALT+SHIFT+P** - Show/hide
- **ALT+SHIFT+C** - Toggle click-through
- **ALT+SHIFT+O** - Open settings

## 📄 Full Release Notes

See [RELEASE_NOTES_v0.1.0.md](docs/RELEASE_NOTES_v0.1.0.md) for complete details.

## 🐛 Known Issues

**Windows SmartScreen Warning:** App is unsigned. Click "More info" → "Run anyway". This is safe - code is open source.

## 🗺️ What's Next

- v0.2.0: Database & session history
- v0.3.0: Native Rust core
- v1.0.0: Code signing & auto-updates

## 🙏 Thank You!

Built with focus, for focus. 🎯
```

---

## 🎉 After Publishing

### 1. Update README Links

Replace placeholders in README.md:
- `YOUR_USERNAME` → Your GitHub username
- Update download links to point to release

### 2. Announce Release

Share on:
- GitHub Discussions
- Social media
- Developer communities
- Productivity forums

### 3. Monitor Feedback

- Watch for bug reports
- Respond to issues
- Collect feature requests
- Plan v0.2.0

---

## 🔄 For Future Releases

### Version Numbering (Semantic Versioning)

- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features, backward compatible
- **Patch** (0.1.1): Bug fixes only

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Create release notes
- [ ] Build installers
- [ ] Test installers
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Upload assets
- [ ] Announce release

---

## 🛠️ Automated Releases (Future)

### GitHub Actions Workflow

Create `.github/workflows/release.yml` to automate:
- Building Windows installers
- Building macOS installers  
- Creating GitHub release
- Uploading assets

See GitHub Actions documentation for details.

---

## 📞 Need Help?

- **GitHub Docs:** https://docs.github.com/en/repositories/releasing-projects-on-github
- **Semantic Versioning:** https://semver.org/
- **Keep a Changelog:** https://keepachangelog.com/

---

**Good luck with your release!** 🚀

