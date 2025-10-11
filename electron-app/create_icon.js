/* ============================================
   Icon Generator for Focus Bubbles
   Creates app icon with circle and yellow ring
   ============================================ */

const fs = require('fs');
const path = require('path');

// SVG icon - circle with yellow ring
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background circle -->
  <circle cx="256" cy="256" r="256" fill="#202020"/>
  
  <!-- Outer glow -->
  <circle cx="256" cy="256" r="200" fill="none" stroke="#fbbf24" stroke-width="8" opacity="0.3"/>
  
  <!-- Main yellow ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#fbbf24" stroke-width="24" stroke-linecap="round"/>
  
  <!-- Inner dim ring (progress background) -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="24"/>
  
  <!-- Center dot -->
  <circle cx="256" cy="256" r="20" fill="#fbbf24"/>
</svg>`;

// Write SVG file
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon);
console.log('✅ Created icon.svg');

// Also create a PNG version using a simple base64 encoded PNG
// This is a 256x256 PNG with a circle and yellow ring
const pngIconBase64 = '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';

// For now, just note that we need a proper icon generation tool
console.log('\n📝 To create PNG icons at multiple sizes (16x16, 32x32, 256x256, etc.),');
console.log('   you can use an online SVG to PNG converter or a tool like Inkscape/ImageMagick.');
console.log('\n✅ icon.svg is ready to be converted to PNG format for the app icon.');

