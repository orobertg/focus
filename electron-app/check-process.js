/* ============================================
   Process Checker - Detect Running Focus App
   Run this to check if Focus app is already running
   Usage: node check-process.js
   ============================================ */

const { exec } = require('child_process');
const os = require('os');

console.log('[Process Checker] Checking for Focus app processes...\n');

const platform = os.platform();

if (platform === 'win32') {
  // Windows
  exec('tasklist /FI "IMAGENAME eq electron.exe" /FO CSV /NH', (error, stdout, stderr) => {
    if (error) {
      console.error('[Process Checker] Error:', error);
      return;
    }
    
    const lines = stdout.trim().split('\n').filter(line => line.includes('electron.exe'));
    
    if (lines.length === 0) {
      console.log('[Process Checker] ✅ No Focus app processes found - safe to start');
    } else {
      console.log('[Process Checker] ⚠️  Found', lines.length, 'Electron process(es):');
      lines.forEach((line, index) => {
        const parts = line.split('","');
        if (parts.length >= 2) {
          const pid = parts[1].replace(/"/g, '');
          console.log(`  ${index + 1}. PID: ${pid}`);
        }
      });
      console.log('\n[Process Checker] To kill orphaned processes:');
      lines.forEach(line => {
        const parts = line.split('","');
        if (parts.length >= 2) {
          const pid = parts[1].replace(/"/g, '');
          console.log(`  taskkill /F /PID ${pid}`);
        }
      });
    }
  });
} else if (platform === 'darwin') {
  // macOS
  exec('ps aux | grep electron | grep -v grep', (error, stdout, stderr) => {
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);
    
    if (lines.length === 0) {
      console.log('[Process Checker] ✅ No Focus app processes found - safe to start');
    } else {
      console.log('[Process Checker] ⚠️  Found', lines.length, 'Electron process(es):');
      lines.forEach((line, index) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        console.log(`  ${index + 1}. PID: ${pid}`);
      });
      console.log('\n[Process Checker] To kill orphaned processes:');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        console.log(`  kill -9 ${pid}`);
      });
    }
  });
} else {
  // Linux
  exec('ps aux | grep electron | grep -v grep', (error, stdout, stderr) => {
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);
    
    if (lines.length === 0) {
      console.log('[Process Checker] ✅ No Focus app processes found - safe to start');
    } else {
      console.log('[Process Checker] ⚠️  Found', lines.length, 'Electron process(es):');
      lines.forEach((line, index) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        console.log(`  ${index + 1}. PID: ${pid}`);
      });
      console.log('\n[Process Checker] To kill orphaned processes:');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        console.log(`  kill -9 ${pid}`);
      });
    }
  });
}

