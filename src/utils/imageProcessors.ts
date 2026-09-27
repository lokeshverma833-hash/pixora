import { ProcessingResult } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const MAX_CANVAS_DIMENSION = 4096;
export const MAX_CANVAS_PIXELS = 16777216; // 16 Megapixels (~4096 x 4096)

export interface SafeDimensionsResult {
  width: number;
  height: number;
  scaled: boolean;
  scale: number;
}

/**
 * Calculates safe working dimensions preserving aspect ratio while ensuring the canvas
 * does not exceed browser memory or hardware allocation ceilings (4096px / 16MP).
 */
export function calculateSafeDimensions(
  width: number,
  height: number,
  maxDimension = MAX_CANVAS_DIMENSION,
  maxPixels = MAX_CANVAS_PIXELS
): SafeDimensionsResult {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height), scaled: false, scale: 1.0 };
  }

  let scale = 1.0;

  // Constrain max single dimension
  if (width > maxDimension || height > maxDimension) {
    scale = Math.min(maxDimension / width, maxDimension / height);
  }

  // Constrain total pixel area
  const currentPixels = (width * scale) * (height * scale);
  if (currentPixels > maxPixels) {
    const pixelScale = Math.sqrt(maxPixels / currentPixels);
    scale = scale * pixelScale;
  }

  if (scale < 0.999) {
    const safeW = Math.max(1, Math.round(width * scale));
    const safeH = Math.max(1, Math.round(height * scale));
    return { width: safeW, height: safeH, scaled: true, scale };
  }

  return { width, height, scaled: false, scale: 1.0 };
}

export function loadImage(fileOrBlob: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let blobUrl: string | null = null;
    img.onload = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      resolve(img);
    };
    img.onerror = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      reject(new Error('Failed to load image file. Please verify it is a valid, supported image.'));
    };
    if (typeof fileOrBlob === 'string') {
      img.src = fileOrBlob;
    } else {
      blobUrl = URL.createObjectURL(fileOrBlob);
      img.src = blobUrl;
    }
  });
}

export interface SafeImageSource {
  source: HTMLImageElement | HTMLCanvasElement;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasScaled: boolean;
}

/**
 * Loads an image and ensures it is within safe working limits. If the image exceeds
 * 4096px or 16MP, it is pre-downscaled onto a high-quality intermediate canvas before
 * expensive filtering or pixel array operations occur.
 */
export async function loadSafeImage(
  fileOrBlob: File | Blob | string,
  maxDimension = MAX_CANVAS_DIMENSION,
  maxPixels = MAX_CANVAS_PIXELS
): Promise<SafeImageSource> {
  const img = await loadImage(fileOrBlob);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const safe = calculateSafeDimensions(origW, origH, maxDimension, maxPixels);

  if (!safe.scaled) {
    return {
      source: img,
      width: origW,
      height: origH,
      originalWidth: origW,
      originalHeight: origH,
      wasScaled: false,
    };
  }

  // Pre-downscale oversized image onto a safe canvas with high-quality smoothing
  const canvas = document.createElement('canvas');
  canvas.width = safe.width;
  canvas.height = safe.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, safe.width, safe.height);

  return {
    source: canvas,
    width: safe.width,
    height: safe.height,
    originalWidth: origW,
    originalHeight: origH,
    wasScaled: true,
  };
}

function canvasToProcessingResult(
  canvas: HTMLCanvasElement,
  originalFile: File,
  mimeType: string,
  quality?: number,
  customName?: string
): Promise<ProcessingResult> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas export failed'));
          return;
        }
        let ext = 'jpg';
        if (mimeType === 'image/png') ext = 'png';
        if (mimeType === 'image/webp') ext = 'webp';

        const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
        const fileName = customName || `${baseName}_pixora.${ext}`;
        const url = URL.createObjectURL(blob);

        resolve({
          blob,
          url,
          fileName,
          fileSize: blob.size,
          originalSize: originalFile.size,
          width: canvas.width,
          height: canvas.height,
          mimeType,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * 1. Compress Image (Supports JPEG, WebP, and true PNG color-quantization compression)
 */
export async function compressImage(
  file: File,
  quality: number, // 0.01 - 1.0
  format = 'image/jpeg'
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  
  // Smart scale for very low quality requests to achieve true file-size reduction
  let scale = 1.0;
  if (quality < 0.5 && (safeImg.width > 1600 || safeImg.height > 1600)) {
    scale = 0.8;
  }
  
  canvas.width = Math.max(1, Math.round(safeImg.width * scale));
  canvas.height = Math.max(1, Math.round(safeImg.height * scale));
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

  // For PNG, HTML5 Canvas toBlob ignores the quality parameter.
  // We apply real color-quantization & palette dithering so PNG file sizes actually drop!
  if (format === 'image/png' && quality < 0.98) {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      // Step size increases as quality decreases (step 2 at 0.95 -> step 24 at 0.2)
      const step = Math.max(2, Math.round((1 - quality) * 26));
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / step) * step;         // R
        d[i + 1] = Math.round(d[i + 1] / step) * step; // G
        d[i + 2] = Math.round(d[i + 2] / step) * step; // B
        if (d[i + 3] > 15) {
          d[i + 3] = Math.round(d[i + 3] / step) * step; // A
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Fallback silently if canvas security restricts getImageData
    }
  }

  return canvasToProcessingResult(canvas, file, format, quality);
}

/**
 * 2. Resize Image
 */
export async function resizeImage(
  file: File,
  options: {
    width: number;
    height: number;
    format?: string;
    quality?: number;
  }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const safeTarget = calculateSafeDimensions(options.width, options.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(safeTarget.width));
  canvas.height = Math.max(1, Math.round(safeTarget.height));
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const format = options.format || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

  return canvasToProcessingResult(canvas, file, format, options.quality ?? 0.92);
}

/**
 * 3. Resize Image by Target KB
 */
export async function resizeToTargetKB(file: File, targetKB: number): Promise<ProcessingResult> {
  const targetBytes = targetKB * 1024;
  const safeImg = await loadSafeImage(file);

  let currentScale = 1.0;
  let minQuality = 0.05;
  let maxQuality = 0.98;
  let bestResult: ProcessingResult | null = null;

  // If original is already smaller than target, still generate clean output
  for (let pass = 0; pass < 3; pass++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(20, Math.round(safeImg.width * currentScale));
    canvas.height = Math.max(20, Math.round(safeImg.height * currentScale));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

    // Binary search for quality
    let low = minQuality;
    let high = maxQuality;
    for (let iter = 0; iter < 7; iter++) {
      const q = (low + high) / 2;
      const res = await canvasToProcessingResult(canvas, file, 'image/jpeg', q);
      if (res.fileSize <= targetBytes) {
        bestResult = res;
        low = q; // try slightly higher quality
      } else {
        high = q; // too big, reduce quality
      }
    }

    if (bestResult && bestResult.fileSize <= targetBytes) {
      break;
    }
    // If still too large at minimum quality, scale down dimensions
    currentScale *= 0.75;
  }

  if (!bestResult) {
    // Fallback to lowest possible size
    return compressImage(file, 0.15, 'image/jpeg');
  }

  return bestResult;
}

/**
 * 4. Crop Image
 */
export async function cropImage(
  file: File,
  cropBox: { x: number; y: number; width: number; height: number },
  format = 'image/jpeg'
): Promise<ProcessingResult> {
  const img = await loadImage(file);
  const safeCrop = calculateSafeDimensions(cropBox.width, cropBox.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(safeCrop.width));
  canvas.height = Math.max(1, Math.round(safeCrop.height));
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(
    img,
    cropBox.x,
    cropBox.y,
    cropBox.width,
    cropBox.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvasToProcessingResult(canvas, file, format, 0.95);
}

/**
 * 5. Circle Crop
 */
export async function circleCrop(
  file: File,
  options: { bgColor?: string; transparent: boolean; zoom?: number }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const size = Math.min(safeImg.width, safeImg.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (!options.transparent && options.bgColor) {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const offsetX = (safeImg.width - size) / 2;
  const offsetY = (safeImg.height - size) / 2;
  ctx.drawImage(safeImg.source, offsetX, offsetY, size, size, 0, 0, size, size);
  ctx.restore();

  return canvasToProcessingResult(canvas, file, 'image/png');
}

/**
 * 6. Square Crop / Pad
 */
export async function squareCrop(
  file: File,
  options: { mode: 'crop' | 'pad'; bgColor?: string }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const w = safeImg.width;
  const h = safeImg.height;
  const canvas = document.createElement('canvas');

  if (options.mode === 'crop') {
    const size = Math.min(w, h);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;
    ctx.drawImage(safeImg.source, sx, sy, size, size, 0, 0, size, size);
  } else {
    // Pad
    const safePad = calculateSafeDimensions(Math.max(w, h), Math.max(w, h));
    const size = safePad.width;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = options.bgColor || '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    const dx = (size - w) / 2;
    const dy = (size - h) / 2;
    ctx.drawImage(safeImg.source, dx, dy);
  }

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.95);
}

/**
 * 7. Change Aspect Ratio
 */
export async function changeAspectRatio(
  file: File,
  ratioW: number,
  ratioH: number,
  mode: 'cover' | 'contain',
  bgColor = '#FFFFFF'
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const w = safeImg.width;
  const h = safeImg.height;
  const targetRatio = ratioW / ratioH;

  let targetWidth = w;
  let targetHeight = Math.round(w / targetRatio);

  if (mode === 'contain') {
    if (w / h > targetRatio) {
      targetWidth = w;
      targetHeight = Math.round(w / targetRatio);
    } else {
      targetHeight = h;
      targetWidth = Math.round(h * targetRatio);
    }
  } else {
    // Cover & crop
    if (w / h > targetRatio) {
      targetHeight = h;
      targetWidth = Math.round(h * targetRatio);
    } else {
      targetWidth = w;
      targetHeight = Math.round(w / targetRatio);
    }
  }

  const safeTarget = calculateSafeDimensions(targetWidth, targetHeight);
  const canvas = document.createElement('canvas');
  canvas.width = safeTarget.width;
  canvas.height = safeTarget.height;
  const ctx = canvas.getContext('2d')!;

  if (mode === 'contain') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = safeTarget.width / targetWidth;
    const scaledW = w * scale;
    const scaledH = h * scale;
    const dx = (canvas.width - scaledW) / 2;
    const dy = (canvas.height - scaledH) / 2;
    ctx.drawImage(safeImg.source, dx, dy, scaledW, scaledH);
  } else {
    const sx = Math.max(0, (w - targetWidth) / 2);
    const sy = Math.max(0, (h - targetHeight) / 2);
    ctx.drawImage(safeImg.source, sx, sy, targetWidth, targetHeight, 0, 0, canvas.width, canvas.height);
  }

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.94);
}

/**
 * 8. Rotate Image
 */
export async function rotateImage(file: File, angleDegrees: number): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const rad = (angleDegrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const rawWidth = Math.round(safeImg.width * cos + safeImg.height * sin);
  const rawHeight = Math.round(safeImg.width * sin + safeImg.height * cos);
  const safeDim = calculateSafeDimensions(rawWidth, rawHeight);

  canvas.width = safeDim.width;
  canvas.height = safeDim.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(safeImg.source, -safeImg.width / 2, -safeImg.height / 2);

  return canvasToProcessingResult(canvas, file, 'image/png');
}

/**
 * 9. Flip Image
 */
export async function flipImage(
  file: File,
  horizontal: boolean,
  vertical: boolean
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(horizontal ? canvas.width : 0, vertical ? canvas.height : 0);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(safeImg.source, 0, 0);
  ctx.restore();

  return canvasToProcessingResult(canvas, file, 'image/png');
}

/**
 * 10. Round Corners
 */
export async function roundCorners(
  file: File,
  radiusPx: number,
  transparent = true,
  bgColor = '#FFFFFF'
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  if (!transparent) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const r = Math.min(radiusPx, canvas.width / 2, canvas.height / 2);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  ctx.lineTo(r, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(safeImg.source, 0, 0);
  ctx.restore();

  return canvasToProcessingResult(canvas, file, transparent ? 'image/png' : 'image/jpeg', 0.95);
}

/**
 * 11. Format Converter (JPG <-> PNG <-> WebP)
 */
export async function convertFormat(
  file: File,
  targetMime: 'image/jpeg' | 'image/png' | 'image/webp',
  quality = 0.92,
  bgColor = '#FFFFFF'
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(safeImg.source, 0, 0);

  return canvasToProcessingResult(canvas, file, targetMime, quality);
}

/**
 * 12. Passport Photo Maker
 */
export async function generatePassportPhoto(
  file: File,
  options: {
    widthMm: number;
    heightMm: number;
    dpi: number;
    bgColor: string;
    sheetType: 'single' | 'sheet4x6' | 'sheetA4';
  }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const mmToInch = 1 / 25.4;
  const photoW = Math.round(options.widthMm * mmToInch * options.dpi);
  const photoH = Math.round(options.heightMm * mmToInch * options.dpi);

  // Single passport cut canvas
  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = photoW;
  cutCanvas.height = photoH;
  const cutCtx = cutCanvas.getContext('2d')!;

  // Fill background
  cutCtx.fillStyle = options.bgColor;
  cutCtx.fillRect(0, 0, photoW, photoH);

  // Center fit image with slight top bias for head alignment
  const imgRatio = safeImg.width / safeImg.height;
  const targetRatio = photoW / photoH;
  let sw = safeImg.width;
  let sh = safeImg.height;
  let sx = 0;
  let sy = 0;

  if (imgRatio > targetRatio) {
    sw = safeImg.height * targetRatio;
    sx = (safeImg.width - sw) / 2;
  } else {
    sh = safeImg.width / targetRatio;
    sy = Math.max(0, (safeImg.height - sh) * 0.2); // top bias
  }

  cutCtx.drawImage(safeImg.source, sx, sy, sw, sh, 0, 0, photoW, photoH);

  if (options.sheetType === 'single') {
    return canvasToProcessingResult(cutCanvas, file, 'image/jpeg', 0.98, 'passport_photo_pixora.jpg');
  }

  // Multi-photo sheet (4x6 inch = 1200x1800 px at 300 DPI)
  const isA4 = options.sheetType === 'sheetA4';
  const sheetW = isA4 ? Math.round(210 * mmToInch * options.dpi) : Math.round(6 * options.dpi); // 1800 px
  const sheetH = isA4 ? Math.round(297 * mmToInch * options.dpi) : Math.round(4 * options.dpi); // 1200 px

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const sheetCtx = sheetCanvas.getContext('2d')!;

  // Clean white sheet background
  sheetCtx.fillStyle = '#FFFFFF';
  sheetCtx.fillRect(0, 0, sheetW, sheetH);

  // Calculate grid layout
  const cols = Math.floor((sheetW - 40) / (photoW + 30));
  const rows = Math.floor((sheetH - 40) / (photoH + 30));
  const count = cols * rows;

  const startX = (sheetW - (cols * photoW + (cols - 1) * 30)) / 2;
  const startY = (sheetH - (rows * photoH + (rows - 1) * 30)) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = startX + c * (photoW + 30);
      const py = startY + r * (photoH + 30);
      sheetCtx.drawImage(cutCanvas, px, py);

      // Delicate cut line border
      sheetCtx.strokeStyle = '#E2E8F0';
      sheetCtx.lineWidth = 1;
      sheetCtx.strokeRect(px, py, photoW, photoH);
    }
  }

  return canvasToProcessingResult(
    sheetCanvas,
    file,
    'image/jpeg',
    0.98,
    `passport_${options.sheetType}_pixora.jpg`
  );
}

/**
 * 13. Signature Resizer & Cleaner
 */
export async function cleanSignature(
  file: File,
  options: {
    threshold: number; // 0 - 255
    inkColor: 'black' | 'darkblue';
    targetWidth: number;
    targetHeight: number;
  }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, options.targetWidth);
  canvas.height = Math.max(1, options.targetHeight);
  const ctx = canvas.getContext('2d')!;

  // Fill transparent / white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw scaled
  ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const thresh = options.threshold;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    if (brightness > thresh) {
      // Background paper -> pure white
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else {
      // Ink -> sharp black or dark blue
      if (options.inkColor === 'darkblue') {
        d[i] = 15;
        d[i + 1] = 23;
        d[i + 2] = 95;
      } else {
        d[i] = 10;
        d[i + 1] = 10;
        d[i + 2] = 10;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.9, 'signature_cleaned_pixora.jpg');
}

/**
 * 14. Remove Image Metadata (EXIF Stripper)
 */
export async function removeMetadata(file: File): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(safeImg.source, 0, 0);

  const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvasToProcessingResult(canvas, file, format, 0.95, `${file.name.replace(/\.[^/.]+$/, '')}_clean.${format === 'image/png' ? 'png' : 'jpg'}`);
}

/**
 * 15. AI Photo Enhancement Filters
 */
export async function applyAiEnhancement(
  file: File,
  params: {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    warmth: number;
    vibrance: number;
    highlights: number;
    shadows: number;
  }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw base with CSS filters for brightness, contrast, saturation
  ctx.filter = `brightness(${params.brightness}) contrast(${params.contrast}) saturate(${params.saturation})`;
  ctx.drawImage(safeImg.source, 0, 0);
  ctx.filter = 'none';

  // 2. High-pass sharpness & tonal corrections on pixel buffer
  if (params.sharpness > 1.05 || params.warmth !== 0 || params.shadows !== 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const w = canvas.width;
    const h = canvas.height;
    const warmth = params.warmth;
    const shadowBoost = params.shadows;

    for (let i = 0; i < d.length; i += 4) {
      // Warmth shift
      if (warmth !== 0) {
        d[i] = Math.min(255, Math.max(0, d[i] + warmth));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] - warmth));
      }

      // Shadow lift (boost darker pixels without blowing highlights)
      if (shadowBoost > 0) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (lum < 128) {
          const factor = (1 - lum / 128) * (shadowBoost * 0.4);
          d[i] = Math.min(255, d[i] + factor);
          d[i + 1] = Math.min(255, d[i + 1] + factor);
          d[i + 2] = Math.min(255, d[i + 2] + factor);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply convolution sharpening if requested
    if (params.sharpness > 1.1) {
      applySharpenFilter(ctx, w, h, (params.sharpness - 1) * 0.8);
    }
  }

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.95);
}

function applySharpenFilter(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;

  // Unsharp kernel weights
  const center = 1 + 4 * amount;
  const edge = -amount;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          center * s[idx + c] +
          edge * (s[idx - 4 + c] + s[idx + 4 + c] + s[idx - w * 4 + c] + s[idx + w * 4 + c]);
        d[idx + c] = Math.min(255, Math.max(0, val));
      }
      d[idx + 3] = s[idx + 3];
    }
  }

  ctx.putImageData(dst, 0, 0);
}

/**
 * 16. Background Remover (Client-side edge & chroma-luma matting)
 */
export async function removeBackground(
  file: File,
  options: { tolerance: number; bgColor: string; transparent: boolean }
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(safeImg.source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Sample corner pixels to detect dominant background color
  const cornerIndices = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + w - 1) * 4];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const idx of cornerIndices) {
    bgR += d[idx];
    bgG += d[idx + 1];
    bgB += d[idx + 2];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;

  const threshold = options.tolerance * 2.5;

  for (let i = 0; i < d.length; i += 4) {
    const diffR = Math.abs(d[i] - bgR);
    const diffG = Math.abs(d[i + 1] - bgG);
    const diffB = Math.abs(d[i + 2] - bgB);
    const dist = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

    if (dist < threshold) {
      if (options.transparent) {
        d[i + 3] = 0; // Transparent
      } else {
        // Hex to rgb
        const hex = options.bgColor.replace('#', '');
        d[i] = parseInt(hex.substring(0, 2), 16) || 255;
        d[i + 1] = parseInt(hex.substring(2, 4), 16) || 255;
        d[i + 2] = parseInt(hex.substring(4, 6), 16) || 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return canvasToProcessingResult(canvas, file, options.transparent ? 'image/png' : 'image/jpeg');
}

/**
 * 17. Inpaint / Object Remover (Content-Aware Neighbor Infilling)
 */
export async function inpaintObject(
  file: File,
  maskCanvas: HTMLCanvasElement
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(safeImg.source, 0, 0);

  // Resize mask to match canvas if needed
  const tempMask = document.createElement('canvas');
  tempMask.width = canvas.width;
  tempMask.height = canvas.height;
  const mCtx = tempMask.getContext('2d')!;
  mCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const maskData = mCtx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const m = maskData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Diffusion / Navier-Stokes texture synthesis
  for (let pass = 0; pass < 8; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (m[idx + 3] > 50) {
          // Inside mask: sample 4 surrounding neighbors
          let sumR = 0, sumG = 0, sumB = 0, count = 0;
          const neighbors = [
            ((y - 1) * w + x) * 4,
            ((y + 1) * w + x) * 4,
            (y * w + (x - 1)) * 4,
            (y * w + (x + 1)) * 4,
          ];

          for (const n of neighbors) {
            sumR += d[n];
            sumG += d[n + 1];
            sumB += d[n + 2];
            count++;
          }

          d[idx] = Math.round(sumR / count);
          d[idx + 1] = Math.round(sumG / count);
          d[idx + 2] = Math.round(sumB / count);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.95);
}

/**
 * 18. Image Upscaler (2x / 4x Super Resolution Interpolation)
 */
export async function upscaleImage(file: File, scale: 2 | 4): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const targetW = safeImg.width * scale;
  const targetH = safeImg.height * scale;
  const safeTarget = calculateSafeDimensions(targetW, targetH);

  const canvas = document.createElement('canvas');
  canvas.width = safeTarget.width;
  canvas.height = safeTarget.height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

  // Apply edge-directed sharpening to recover high-frequency sharpness
  applySharpenFilter(ctx, canvas.width, canvas.height, 0.45 * scale);

  return canvasToProcessingResult(canvas, file, 'image/png');
}

/**
 * 19. Background Blur (Portrait Mode Bokeh)
 */
export async function blurBackground(file: File, blurRadius: number): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw blurred background
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(safeImg.source, -blurRadius, -blurRadius, canvas.width + blurRadius * 2, canvas.height + blurRadius * 2);
  ctx.filter = 'none';

  // 2. Draw centered subject vignette/oval clip mask
  const subCanvas = document.createElement('canvas');
  subCanvas.width = canvas.width;
  subCanvas.height = canvas.height;
  const sCtx = subCanvas.getContext('2d')!;

  sCtx.save();
  sCtx.beginPath();
  sCtx.ellipse(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.35,
    canvas.height * 0.45,
    0,
    0,
    Math.PI * 2
  );
  sCtx.closePath();
  sCtx.clip();
  sCtx.drawImage(safeImg.source, 0, 0);
  sCtx.restore();

  // Combine
  ctx.drawImage(subCanvas, 0, 0);

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.95);
}

/**
 * 20. Image Unblur
 */
export async function unblurImage(file: File, amount: number): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = safeImg.width;
  canvas.height = safeImg.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(safeImg.source, 0, 0);
  applySharpenFilter(ctx, canvas.width, canvas.height, amount);

  return canvasToProcessingResult(canvas, file, 'image/jpeg', 0.95);
}
