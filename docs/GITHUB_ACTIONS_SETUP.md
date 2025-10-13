# GitHub Actions - Automated Multi-Platform Builds

## Overview

Focus uses GitHub Actions to automatically build packages for Windows, Linux, and macOS on every commit and release.

**Benefits:**
- ✅ Automated builds on push to main/develop
- ✅ Multi-platform builds (Windows, Linux, macOS)
- ✅ Automatic release creation with tagged commits
- ✅ No local Mac hardware needed for macOS builds
- ✅ Free for public repositories

---

## Workflows

### 1. Build & Release (`build.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Tags starting with `v` (e.g., `v0.1.1`)
- Manual workflow dispatch

**Build Matrix:**
| Platform | Runner | Builds |
|----------|--------|--------|
| Windows | `windows-latest` | Setup.exe, Portable.exe |
| Linux | `ubuntu-latest` | AppImage, deb, rpm |
| macOS | `macos-latest` | DMG, ZIP |

**Process:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Build for platform
5. Upload artifacts
6. Create release (if tagged)

### 2. PR Build Check (`pr-build.yml`)

**Purpose:** Quick validation of pull requests without full multi-platform builds.

**Triggers:**
- Pull requests that modify `electron-app/` or workflows

**Checks:**
- Dependencies install correctly
- Tests pass
- Build configuration is valid

---

## Usage

### Regular Commits

```bash
git add .
git commit -m "feat: Add new feature"
git push origin main
```

**Result:** Builds run automatically, artifacts saved for 30 days

### Creating a Release

```bash
# Bump version in package.json first
git add electron-app/package.json
git commit -m "chore: Bump version to 0.1.1"
git tag v0.1.1
git push origin main --tags
```

**Result:**
1. All platforms build
2. Draft release created automatically
3. All build artifacts attached
4. Release notes generated

**Then:**
1. Go to GitHub → Releases
2. Edit the draft release
3. Add/edit release notes
4. Publish the release ✅

---

## Build Artifacts

### Where to Find Them

**For regular commits:**
1. Go to GitHub → Actions
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download `windows-packages`, `linux-packages`, or `macos-packages`

**For releases:**
1. Go to GitHub → Releases
2. Assets are automatically attached

### Artifact Contents

**Windows (`windows-packages`):**
```
Focus-0.1.1-Setup.exe
Focus-0.1.1-Setup.exe.blockmap
Focus-0.1.1-Portable.exe
```

**Linux (`linux-packages`):**
```
Focus-0.1.1-x86_64.AppImage
Focus-0.1.1-amd64.deb
Focus-0.1.1-x86_64.rpm
```

**macOS (`macos-packages`):**
```
Focus-0.1.1-x64.dmg
Focus-0.1.1-arm64.dmg
Focus-0.1.1-x64.zip
Focus-0.1.1-arm64.zip
```

---

## Configuration

### Build Scripts (package.json)

The workflows use these npm scripts:
```json
{
  "scripts": {
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:mac": "electron-builder --mac"
  }
}
```

### Environment Variables

**macOS Code Signing:**
```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
```
- Disables automatic code signing (we don't have certificates yet)
- macOS builds will be unsigned but still work
- Users need to right-click → Open on first launch

**To enable signing (future):**
1. Get Apple Developer account ($99/year)
2. Create certificates
3. Add secrets to GitHub:
   - `CSC_LINK` (certificate .p12 file, base64 encoded)
   - `CSC_KEY_PASSPHRASE` (certificate password)
   - `APPLE_ID` (for notarization)
   - `APPLE_ID_PASSWORD` (app-specific password)

---

## Troubleshooting

### Build Fails on One Platform

**Check the logs:**
1. GitHub → Actions → Click failed run
2. Expand the failing job
3. Review error messages

**Common issues:**

**Windows:**
- Signing errors (we don't sign yet, should work anyway)
- Missing dependencies (check package.json)

**Linux:**
- `rpm` not installed → Added `sudo apt-get install -y rpm` to workflow
- Icon path issues → Fixed with extraResources

**macOS:**
- Code signing required → Disabled with `CSC_IDENTITY_AUTO_DISCOVERY: false`
- DMG creation fails → Check disk space on runner

### Artifacts Not Uploading

**Check the paths:**
```yaml
- name: Upload Windows artifacts
  uses: actions/upload-artifact@v4
  with:
    path: |
      electron-app/dist/*.exe
```

**Verify files exist:**
```yaml
- name: List build artifacts (debug)
  run: ls -lah electron-app/dist
```

### Release Not Creating

**Requirements:**
- Must push a tag starting with `v`
- Tag must match semver pattern (e.g., `v0.1.1`)
- All builds must succeed

**Check:**
```bash
git tag
git push origin --tags
```

---

## Advanced Configuration

### Only Build on Release

Edit `.github/workflows/build.yml`:
```yaml
on:
  push:
    tags:
      - 'v*'  # Only build on version tags
```

### Add Notarization (macOS)

When you have Apple Developer account:

```yaml
- name: Build macOS
  env:
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
  run: npm run build:mac
```

### Build Specific Architectures

```yaml
strategy:
  matrix:
    include:
      - os: macos-latest
        arch: x64
      - os: macos-latest
        arch: arm64
```

---

## Cost & Limits

### Free Tier (Public Repos)
- ✅ 2,000 minutes/month on Linux
- ✅ 2,000 minutes/month on Windows
- ✅ Unlimited minutes on macOS (but 10x multiplier)
- ✅ Unlimited storage for public repos

### Build Times
- **Windows:** ~5-8 minutes
- **Linux:** ~4-6 minutes
- **macOS:** ~8-12 minutes

**Total per release:** ~20 minutes (uses ~200 macOS-equivalent minutes)

### Staying Within Limits

**For 10 releases/month:**
- Total minutes: ~200 macOS-equivalent minutes
- Well within free tier ✅

**To reduce usage:**
- Only build on tags (not every commit)
- Use branch protection (prevent bad commits)
- Cache dependencies (already configured)

---

## Migration from Local Builds

### Before (Manual)
```bash
# On Windows
npm run build:win

# On Linux/WSL
npm run build:linux

# On Mac (needed Mac hardware)
npm run build:mac
```

### After (Automated)
```bash
# Just tag and push
git tag v0.1.1
git push origin main --tags

# GitHub Actions builds all platforms automatically
```

---

## Status Badges

Add to your README.md:

```markdown
[![Build Status](https://github.com/go-robert/focus/workflows/Build%20%26%20Release/badge.svg)](https://github.com/go-robert/focus/actions)
```

---

## Next Steps

1. **First Build:**
   - Commit the workflow files
   - Push to main
   - Check Actions tab for results

2. **First Release:**
   - Update version in `package.json`
   - Commit and tag: `git tag v0.1.1`
   - Push tags: `git push origin --tags`
   - Check Releases for draft release

3. **Future:**
   - Add code signing certificates
   - Enable auto-updates
   - Add more platforms (Snap, Flatpak, etc.)

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [electron-builder CI Config](https://www.electron.build/configuration/configuration#configuration)
- [Actions/upload-artifact](https://github.com/actions/upload-artifact)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)

---

**Status:** ✅ Configured and ready to use  
**Last Updated:** October 13, 2025  
**Next:** Commit workflow files and push to trigger first build

