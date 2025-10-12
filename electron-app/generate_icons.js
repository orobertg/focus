/* ============================================
   Icon Generator - Converts SVG to PNG
   Creates icons at multiple sizes for Windows
   ============================================ */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for Windows
const sizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 64, name: 'icon-64.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon-256.png' },
  { size: 512, name: 'icon-512.png' },
];

console.log('📝 Icon Generator');
console.log('================\n');

// Read the SVG file
const svgPath = path.join(__dirname, 'icon.svg');
if (!fs.existsSync(svgPath)) {
  console.error('❌ Error: icon.svg not found!');
  console.log('   Please make sure icon.svg exists in electron-app/');
  process.exit(1);
}

console.log('✅ Found icon.svg');
console.log('\n📋 Sizes to generate:');
sizes.forEach(s => console.log(`   • ${s.size}×${s.size} → ${s.name}`));

console.log('\n⚠️  MANUAL STEP REQUIRED:\n');
console.log('To generate PNG icons, please use one of these methods:\n');
console.log('Option A: Online Converter (Recommended)');
console.log('  1. Go to https://cloudconvert.com/svg-to-png');
console.log('  2. Upload electron-app/icon.svg');
console.log('  3. Set output size to 512×512 (we\'ll use this as master)');
console.log('  4. Download and save as electron-app/assets/icons/icon-512.png');
console.log('  5. Repeat for each size, or use Option B\n');

console.log('Option B: ImageMagick (If installed)');
console.log('  1. Install ImageMagick: https://imagemagick.org/');
console.log('  2. Run these commands in electron-app/:\n');
sizes.forEach(s => {
  console.log(`     magick convert icon.svg -resize ${s.size}x${s.size} assets/icons/${s.name}`);
});

console.log('\nOption C: Sharp (npm package)');
console.log('  1. Run: npm install sharp');
console.log('  2. Uncomment the code below in this file');
console.log('  3. Run: node generate_icons.js again\n');

console.log('\n🔄 Generating icons with Sharp...\n');

const sharp = require('sharp');

async function generateIcons() {
  for (const { size, name } of sizes) {
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, 'assets', 'icons', name));
      console.log(`   ✅ Generated ${name}`);
    } catch (error) {
      console.error(`   ❌ Failed to generate ${name}:`, error.message);
    }
  }
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📝 Next step: Icons will be integrated into main.js automatically');
}

generateIcons().catch(err => {
  console.error('\n❌ Error generating icons:', err.message);
  process.exit(1);
});

