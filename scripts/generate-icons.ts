import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Standard Pixora App Emblem SVG (512x512)
const createStandardSvg = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- Outer Ribbon Gradient: Vibrant Indigo to Electric Cyan -->
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>

    <!-- Inner Loop Gradient: Violet to Fuchsia Pink -->
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="60%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>

    <!-- AI Sparkle Gradient -->
    <linearGradient id="spark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>

    <!-- Border Glow -->
    <linearGradient id="border-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#6366F1" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0.6" />
    </linearGradient>
  </defs>

  <!-- Squircle Base Tile -->
  <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bg-grad)" stroke="url(#border-glow)" stroke-width="12"/>

  <!-- Inner Soft Bevel Highlight -->
  <rect x="28" y="28" width="456" height="456" rx="108" stroke="white" stroke-opacity="0.1" stroke-width="6"/>

  <!-- Emblem Mark Group -->
  <g transform="translate(18, 18) scale(9.8)">
    <!-- Stem of P -->
    <path
      d="M12 11C12 9.89543 12.8954 9 14 9H17C18.1046 9 19 9.89543 19 11V33C19 34.1046 18.1046 35 17 35H14C12.8954 35 12 34.1046 12 33V11Z"
      fill="url(#grad1)"
    />

    <!-- Loop of P -->
    <path
      d="M17 9H25C29.4183 9 33 12.5817 33 17C33 21.4183 29.4183 25 25 25H17V9Z"
      fill="url(#grad2)"
      fill-opacity="0.95"
    />

    <!-- Aperture Center Ring -->
    <circle
      cx="24"
      cy="17"
      r="4"
      fill="#0F172A"
      stroke="url(#grad1)"
      stroke-width="1.5"
    />

    <!-- Cyan Focal Core -->
    <circle
      cx="24"
      cy="17"
      r="1.6"
      fill="#38BDF8"
    />

    <!-- Lower Dynamic Fold -->
    <path
      d="M19 21L25 25C21.5 25 19 23.5 19 21Z"
      fill="#1E1B4B"
      fill-opacity="0.7"
    />

    <!-- AI Sparkle Flare -->
    <path
      d="M33 7C33 9.2 34.8 11 37 11C34.8 11 33 12.8 33 15C33 12.8 31.2 11 29 11C31.2 11 33 9.2 33 7Z"
      fill="url(#spark)"
    />
  </g>
</svg>
`;

// Maskable Icon SVG (Android safe-zone compliant: Full background fill with emblem centered in 80% circle)
const createMaskableSvg = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="m-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="m-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="m-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="60%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
    <linearGradient id="m-spark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Maskable Icon -->
  <rect width="512" height="512" fill="url(#m-bg-grad)"/>

  <!-- Centered Safe-Zone Emblem Mark -->
  <g transform="translate(68, 68) scale(7.8)">
    <path
      d="M12 11C12 9.89543 12.8954 9 14 9H17C18.1046 9 19 9.89543 19 11V33C19 34.1046 18.1046 35 17 35H14C12.8954 35 12 34.1046 12 33V11Z"
      fill="url(#m-grad1)"
    />
    <path
      d="M17 9H25C29.4183 9 33 12.5817 33 17C33 21.4183 29.4183 25 25 25H17V9Z"
      fill="url(#m-grad2)"
      fill-opacity="0.95"
    />
    <circle
      cx="24"
      cy="17"
      r="4"
      fill="#0F172A"
      stroke="url(#m-grad1)"
      stroke-width="1.5"
    />
    <circle
      cx="24"
      cy="17"
      r="1.6"
      fill="#38BDF8"
    />
    <path
      d="M19 21L25 25C21.5 25 19 23.5 19 21Z"
      fill="#1E1B4B"
      fill-opacity="0.7"
    />
    <path
      d="M33 7C33 9.2 34.8 11 37 11C34.8 11 33 12.8 33 15C33 12.8 31.2 11 29 11C31.2 11 33 9.2 33 7Z"
      fill="url(#m-spark)"
    />
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Rendering high-res Pixora PWA icons...');

  // 1. icon-512.png (512x512)
  const svg512 = Buffer.from(createStandardSvg(512));
  await sharp(svg512)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 2. icon-192.png (192x192)
  await sharp(svg512)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 3. apple-touch-icon.png (180x180 for iOS)
  await sharp(svg512)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 4. icon-maskable-512.png (512x512 with safe-zone)
  const maskableSvg = Buffer.from(createMaskableSvg(512));
  await sharp(maskableSvg)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // 5. Save raw SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), createStandardSvg(512));
  console.log('Generated icon.svg');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
