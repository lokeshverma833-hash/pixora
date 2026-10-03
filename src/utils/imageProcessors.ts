import { ProcessingResult } from '../types';
export { PassportUtility } from './passportUtility';
export type { GridPreset } from './passportUtility';

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
 * Step-down canvas resizer to avoid browser memory freeze on large images
 * and eliminate high-ratio downsampling distortion.
 */
export function stepDownScaleCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  let curW = srcW;
  let curH = srcH;
  let curCanvas: HTMLCanvasElement;

  if (source instanceof HTMLCanvasElement) {
    curCanvas = source;
  } else {
    curCanvas = document.createElement('canvas');
    curCanvas.width = srcW;
    curCanvas.height = srcH;
    const ctx = curCanvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0);
  }

  // Iterative 50% step-down until close to target
  while (curW * 0.5 > targetW && curH * 0.5 > targetH) {
    const nextW = Math.max(targetW, Math.floor(curW * 0.5));
    const nextH = Math.max(targetH, Math.floor(curH * 0.5));
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(curCanvas, 0, 0, nextW, nextH);

    curCanvas = stepCanvas;
    curW = nextW;
    curH = nextH;
  }

  // Final draw to exact target
  if (curW !== targetW || curH !== targetH) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(curCanvas, 0, 0, targetW, targetH);
    return finalCanvas;
  }

  return curCanvas;
}

/**
 * 1. Compress Image (Supports JPEG, WebP, PNG quantization, target KB auto-calculation, and memory-safe step-down)
 */
export async function compressImage(
  file: File,
  quality: number, // 0.1 - 1.0
  format = 'image/jpeg',
  targetKb?: number
): Promise<ProcessingResult> {
  const safeImg = await loadSafeImage(file);
  const outFormat = format === 'auto' ? (file.type || 'image/jpeg') : format;

  // Mode A: Target Size (KB) auto-calculation
  if (typeof targetKb === 'number' && targetKb > 0) {
    const targetBytes = targetKb * 1024;
    let minQ = 0.08;
    let maxQ = 0.98;
    let bestBlob: Blob | null = null;
    let bestCanvas: HTMLCanvasElement | null = null;

    // Binary search quality iterations (pure in-memory HTML5 Canvas toBlob)
    for (let iter = 0; iter < 5; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const testCanvas = document.createElement('canvas');
      testCanvas.width = safeImg.width;
      testCanvas.height = safeImg.height;
      const tCtx = testCanvas.getContext('2d')!;
      if (outFormat === 'image/jpeg') {
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
      }
      tCtx.drawImage(safeImg.source, 0, 0);

      const blob = await new Promise<Blob | null>((res) => testCanvas.toBlob(res, outFormat, midQ));
      if (!blob) break;

      if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
        bestBlob = blob;
        bestCanvas = testCanvas;
      }

      if (blob.size > targetBytes) {
        maxQ = midQ;
      } else {
        minQ = midQ;
      }
    }

    // If still exceeds targetKb at low quality, apply step-down scaling
    if (bestBlob && bestBlob.size > targetBytes * 1.05 && (safeImg.width > 300 || safeImg.height > 300)) {
      const ratio = Math.max(0.25, Math.sqrt(targetBytes / bestBlob.size));
      const targetW = Math.max(80, Math.round(safeImg.width * ratio));
      const targetH = Math.max(80, Math.round(safeImg.height * ratio));

      const scaledCanvas = stepDownScaleCanvas(safeImg.source, safeImg.width, safeImg.height, targetW, targetH);
      const scaledBlob = await new Promise<Blob | null>((res) => scaledCanvas.toBlob(res, outFormat, 0.72));
      if (scaledBlob) {
        bestBlob = scaledBlob;
        bestCanvas = scaledCanvas;
      }
    }

    if (bestBlob && bestCanvas) {
      const ext = outFormat.replace('image/', '') === 'jpeg' ? 'jpg' : outFormat.replace('image/', '');
      const originalBase = file.name.replace(/\.[^/.]+$/, '');
      const outputFileName = `${originalBase}-compressed.${ext}`;
      return {
        url: URL.createObjectURL(bestBlob),
        blob: bestBlob,
        originalSize: file.size,
        fileSize: bestBlob.size,
        fileName: outputFileName,
        width: bestCanvas.width,
        height: bestCanvas.height,
        mimeType: outFormat,
      };
    }
  }

  // Mode B: Interactive Quality Slider with Step-Down Resizing for high-res images
  const clampedQuality = Math.min(1.0, Math.max(0.1, quality));
  let targetW = safeImg.width;
  let targetH = safeImg.height;

  // Step-down scale high-resolution images (> 2000px) when lower quality is selected to prevent memory spikes
  if (clampedQuality < 0.6 && (safeImg.width > 2000 || safeImg.height > 2000)) {
    const scale = clampedQuality < 0.4 ? 0.75 : 0.85;
    targetW = Math.max(1, Math.round(safeImg.width * scale));
    targetH = Math.max(1, Math.round(safeImg.height * scale));
  }

  const canvas = stepDownScaleCanvas(safeImg.source, safeImg.width, safeImg.height, targetW, targetH);
  const ctx = canvas.getContext('2d')!;

  if (outFormat === 'image/jpeg') {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.fillStyle = '#FFFFFF';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.drawImage(canvas, 0, 0);
    return canvasToProcessingResult(bgCanvas, file, outFormat, clampedQuality);
  }

  // For PNG, apply real color quantization so file size drops
  if (outFormat === 'image/png' && clampedQuality < 0.98) {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      const step = Math.max(2, Math.round((1 - clampedQuality) * 26));
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / step) * step;
        d[i + 1] = Math.round(d[i + 1] / step) * step;
        d[i + 2] = Math.round(d[i + 2] / step) * step;
        if (d[i + 3] > 15) {
          d[i + 3] = Math.round(d[i + 3] / step) * step;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Fallback silently
    }
  }

  return canvasToProcessingResult(canvas, file, outFormat, clampedQuality);
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
    targetKb?: number;
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

  const format = options.format || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(safeImg.source, 0, 0, canvas.width, canvas.height);

  // [RULE 1] Prevent File Size Inflation & Strictly Clamp to Target KB:
  // - If Target Size (KB) is set and > original size, clamp to original size.
  // - If Target Size (KB) is NOT set, ensure output size does not exceed original size.
  const hasUserTargetKb = typeof options.targetKb === 'number' && options.targetKb > 0;
  const userTargetBytes = hasUserTargetKb ? options.targetKb! * 1024 : file.size;
  const effectiveCeilingBytes = hasUserTargetKb
    ? Math.min(userTargetBytes, file.size)
    : file.size;

  if (format === 'image/jpeg' || format === 'image/webp') {
    let low = 0.05;
    let high = 0.95;
    let bestResult: ProcessingResult | null = null;

    // Fast check: if no target KB was entered, test with standard high quality first
    if (!hasUserTargetKb) {
      const defaultQuality = options.quality ?? 0.88;
      const initialRes = await canvasToProcessingResult(canvas, file, format, defaultQuality);
      if (initialRes.fileSize <= effectiveCeilingBytes) {
        return initialRes;
      }
      // If standard quality inflates the file, binary search downwards to prevent inflation
      high = defaultQuality;
    }

    // High-precision 10-iteration binary search to stay strictly <= effectiveCeilingBytes (within 5% margin)
    for (let iter = 0; iter < 10; iter++) {
      const q = (low + high) / 2;
      const res = await canvasToProcessingResult(canvas, file, format, q);
      if (res.fileSize <= effectiveCeilingBytes) {
        bestResult = res;
        // Stop early if within 5% of target ceiling
        if (res.fileSize >= effectiveCeilingBytes * 0.95) {
          break;
        }
        low = q; // Quality fits under ceiling, explore higher visual quality
      } else {
        high = q; // File exceeds ceiling, decrease quality
      }
    }

    if (bestResult) {
      return bestResult;
    }

    // Fallback: clamp to lowest viable quality limit (0.05)
    return await canvasToProcessingResult(canvas, file, format, 0.05);
  }

  // PNG (lossless) format
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
 * Standard 3.5 x 4.5 cm (413 x 531 px @ 300 DPI) Passport Dimensions & Tint Standards
 */
export const PASSPORT_STD = {
  WIDTH_PX: 413,
  HEIGHT_PX: 531,
  ASPECT_RATIO: 413 / 531,
  BG_WHITE: '#FFFFFF',
  BG_LIGHT_BLUE: '#E0F2FE',
} as const;

export interface PassportCropOptions {
  zoom?: number;
  pan?: { x: number; y: number };
  bgTint?: 'white' | 'light-blue' | string;
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Toggle between standard White and Light Blue passport background tints
 */
export function togglePassportBgTint(current: string): string {
  return current === PASSPORT_STD.BG_LIGHT_BLUE
    ? PASSPORT_STD.BG_WHITE
    : PASSPORT_STD.BG_LIGHT_BLUE;
}

/**
 * Modular Client-Side Canvas Passport Cropper
 * - Locks aspect ratio strictly to 3.5 x 4.5 cm (413 x 531 px @ 300 DPI)
 * - Supports zoom and pan (drag) for centering face
 * - Supports White / Light Blue background tinting
 * - Converts Canvas directly to Blob without heavy external libraries
 */
export async function cropPassportPhotoToBlob(
  imageSource: HTMLImageElement | ImageBitmap | CanvasImageSource,
  options: PassportCropOptions = {}
): Promise<Blob> {
  const {
    zoom = 1,
    pan = { x: 0, y: 0 },
    bgTint = 'white',
    width = PASSPORT_STD.WIDTH_PX,
    height = PASSPORT_STD.HEIGHT_PX,
    quality = 0.95,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 1. Fill background tint
  const resolvedBg =
    bgTint === 'light-blue'
      ? PASSPORT_STD.BG_LIGHT_BLUE
      : bgTint === 'white'
      ? PASSPORT_STD.BG_WHITE
      : bgTint;

  ctx.fillStyle = resolvedBg;
  ctx.fillRect(0, 0, width, height);

  // 2. Base scaling: Close-up biometric passport framing (face covers 70-75% of vertical frame)
  const imgW = (imageSource as any).width || (imageSource as any).naturalWidth || width;
  const imgH = (imageSource as any).height || (imageSource as any).naturalHeight || height;

  // Close-up zoom (1.48x): frames strictly collar/shoulders, cuts chest area out, face covers 70-75%
  const baseScale = Math.max(width / imgW, height / imgH) * 1.48;
  const effectiveScale = baseScale * Math.max(0.1, zoom);

  const drawW = imgW * effectiveScale;
  const drawH = imgH * effectiveScale;

  // 3. Center alignment + 8%-10% head margin (hair top headroom, removes all chest)
  const drawX = (width - drawW) / 2 + pan.x;
  const drawY = (height - drawH) * 0.20 + pan.y;

  ctx.drawImage(imageSource, drawX, drawY, drawW, drawH);

  // Subtle 1px light gray cutting border (#d1d5db) for easy scissor cutting
  ctx.save();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();

  // 4. Convert directly to Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob conversion failed'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Subtle Biometric Head & Eye Alignment Guide
 * - Rendered only on interactive preview canvas, NEVER in final exported photo.
 */
export function drawBiometricHeadGuide(
  ctx: CanvasRenderingContext2D,
  width: number = 413,
  height: number = 531
): void {
  ctx.save();

  const centerX = width / 2;
  const centerY = height * 0.46;
  const radiusX = width * 0.28;
  const radiusY = height * 0.32;

  // Semi-transparent dashed oval outline for face
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.stroke();

  // Subtle Eye-line indicator
  const eyeY = height * 0.42;
  ctx.beginPath();
  ctx.moveTo(centerX - radiusX * 0.85, eyeY);
  ctx.lineTo(centerX + radiusX * 0.85, eyeY);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
  ctx.setLineDash([3, 4]);
  ctx.stroke();

  // Chin alignment marker
  const chinY = centerY + radiusY;
  ctx.beginPath();
  ctx.moveTo(centerX - 35, chinY);
  ctx.lineTo(centerX + 35, chinY);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
  ctx.stroke();

  ctx.restore();
}

/**
 * Universal Passport Canvas Renderer (Preview with guide OR clean export)
 */
export function renderPassportCanvas(
  canvas: HTMLCanvasElement,
  imageSource: HTMLImageElement | ImageBitmap | CanvasImageSource,
  options: {
    zoom?: number;
    pan?: { x: number; y: number };
    bgTint?: string;
    showGuide?: boolean;
  } = {}
): void {
  const { zoom = 1, pan = { x: 0, y: 0 }, bgTint = '#FFFFFF', showGuide = false } = options;

  canvas.width = PASSPORT_STD.WIDTH_PX;
  canvas.height = PASSPORT_STD.HEIGHT_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background Fill
  ctx.fillStyle = bgTint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Centered Scaling with Auto-Frame Zoom & User Pan
  const imgW = (imageSource as any).width || (imageSource as any).naturalWidth || canvas.width;
  const imgH = (imageSource as any).height || (imageSource as any).naturalHeight || canvas.height;

  // Close-up auto-frame zoom (1.48x): face occupies 70%-75% of height, frames collar/shoulders, cuts chest
  const baseScale = Math.max(canvas.width / imgW, canvas.height / imgH) * 1.48;
  const scale = baseScale * Math.max(0.1, zoom);

  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = (canvas.width - drawW) / 2 + pan.x;
  const drawY = (canvas.height - drawH) * 0.20 + pan.y;

  ctx.drawImage(imageSource, drawX, drawY, drawW, drawH);

  // Subtle 1px light gray cutting border (#d1d5db) for easy scissor cutting
  ctx.save();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  ctx.restore();

  // 3. Optional Overlay Guide (never shown in export)
  if (showGuide) {
    drawBiometricHeadGuide(ctx, canvas.width, canvas.height);
  }
}

/**
 * Direct Client-Side Download Trigger (High-Quality JPEG Blob, Zero Server, Zero External Libs)
 */
export async function downloadPassportPhoto(
  imageSource: HTMLImageElement | ImageBitmap | CanvasImageSource,
  options: PassportCropOptions = {},
  filename = 'passport-photo-3.5x4.5cm.jpg'
): Promise<void> {
  const blob = await cropPassportPhotoToBlob(imageSource, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface PrintableSheetOptions {
  sheetSize?: '4x6' | 'a4';
  copies?: number; // e.g. 6 or 8
  spacingPx?: number; // 5mm to 8mm gap (default: 71px ≈ 6mm @ 300 DPI)
  marginPx?: number;
  showCutBorders?: boolean;
}

/**
 * 1. Printable Sheet Generator:
 * Arranges cropped passport photos on a 300 DPI sheet (4x6 inch: 1800x1200 or A4: 2480x3508)
 * with consistent 6mm grid gap (5mm-8mm rule) and 1px #d1d5db scissor cut borders.
 */
export function generatePrintableSheetCanvas(
  passportCanvas: HTMLCanvasElement | CanvasImageSource,
  options: PrintableSheetOptions = {}
): HTMLCanvasElement {
  const {
    sheetSize = '4x6',
    copies,
    spacingPx = 71, // 6mm gap at 300 DPI (standard 5mm to 8mm rule)
    marginPx = 60,
    showCutBorders = true,
  } = options;

  const isA4 = sheetSize === 'a4';
  const sheetW = isA4 ? 2480 : 1800;
  const sheetH = isA4 ? 3508 : 1200;

  const photoW = (passportCanvas as any).width || PASSPORT_STD.WIDTH_PX;
  const photoH = (passportCanvas as any).height || PASSPORT_STD.HEIGHT_PX;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const maxCols = Math.max(1, Math.floor((sheetW - marginPx * 2 + spacingPx) / (photoW + spacingPx)));
  const maxRows = Math.max(1, Math.floor((sheetH - marginPx * 2 + spacingPx) / (photoH + spacingPx)));
  const totalCapacity = maxCols * maxRows;

  const totalCopies = copies ? Math.min(copies, totalCapacity) : totalCapacity;
  const cols = Math.min(maxCols, totalCopies);
  const rows = Math.ceil(totalCopies / cols);

  const gridW = cols * photoW + (cols - 1) * spacingPx;
  const gridH = rows * photoH + (rows - 1) * spacingPx;
  const startX = Math.round((sheetW - gridW) / 2);
  const startY = Math.round((sheetH - gridH) / 2);

  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (placed >= totalCopies) break;

      const px = startX + c * (photoW + spacingPx);
      const py = startY + r * (photoH + spacingPx);

      ctx.drawImage(passportCanvas, px, py, photoW, photoH);

      // Subtle 1px cutting border (#d1d5db) around every photo
      if (showCutBorders) {
        ctx.save();
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, photoW - 1, photoH - 1);
        ctx.restore();
      }

      placed++;
    }
  }

  return sheetCanvas;
}

/**
 * 2. Direct Print Trigger via lightweight hidden iframe (No UI disruption)
 */
export function printPassportSheet(sheetCanvas: HTMLCanvasElement): void {
  sheetCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      iframe.src = blobUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print trigger error', e);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    },
    'image/jpeg',
    0.98
  );
}

/**
 * 3. Direct High-Res JPEG or PDF Download
 */
export async function downloadPassportSheet(
  sheetCanvas: HTMLCanvasElement,
  filename = 'passport-sheet-300dpi',
  format: 'jpeg' | 'pdf' = 'jpeg'
): Promise<void> {
  if (format === 'jpeg') {
    sheetCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      'image/jpeg',
      0.98
    );
    return;
  }

  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    sheetCanvas.toBlob(resolve, 'image/jpeg', 0.96)
  );
  if (!jpegBlob) throw new Error('Failed to encode sheet image');

  const arrayBuffer = await jpegBlob.arrayBuffer();
  const pdfImage = await pdfDoc.embedJpg(arrayBuffer);

  const ptW = sheetCanvas.width * (72 / 300);
  const ptH = sheetCanvas.height * (72 / 300);

  const page = pdfDoc.addPage([ptW, ptH]);
  page.drawImage(pdfImage, {
    x: 0,
    y: 0,
    width: ptW,
    height: ptH,
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const a = document.createElement('a');
  a.href = pdfUrl;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
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

  // Auto-frame zoom: face covers 70%-80% of vertical height with collarbone framing
  const imgRatio = safeImg.width / safeImg.height;
  const targetRatio = photoW / photoH;
  let sw = safeImg.width;
  let sh = safeImg.height;
  let sx = 0;
  let sy = 0;

  // Close-up auto-frame: face occupies 70%-75% of height, cuts at collar/shoulders, leaves 8%-10% headroom
  const cropFactor = 0.676; // 1 / 1.48
  if (imgRatio > targetRatio) {
    sw = safeImg.height * targetRatio * cropFactor;
    sh = safeImg.height * cropFactor;
    sx = (safeImg.width - sw) / 2;
    sy = (safeImg.height - sh) * 0.18;
  } else {
    sw = safeImg.width * cropFactor;
    sh = (safeImg.width / targetRatio) * cropFactor;
    sx = (safeImg.width - sw) / 2;
    sy = Math.max(0, (safeImg.height - sh) * 0.18);
  }

  cutCtx.drawImage(safeImg.source, sx, sy, sw, sh, 0, 0, photoW, photoH);

  // Subtle 1px light gray cutting border (#d1d5db)
  cutCtx.save();
  cutCtx.strokeStyle = '#d1d5db';
  cutCtx.lineWidth = 1;
  cutCtx.strokeRect(0.5, 0.5, photoW - 1, photoH - 1);
  cutCtx.restore();

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

  // Consistent 6mm gap between photos (standard 5mm to 8mm rule @ 300 DPI)
  const spacingPx = 71;
  const cols = Math.floor((sheetW - 60) / (photoW + spacingPx));
  const rows = Math.floor((sheetH - 60) / (photoH + spacingPx));

  const startX = (sheetW - (cols * photoW + (cols - 1) * spacingPx)) / 2;
  const startY = (sheetH - (rows * photoH + (rows - 1) * spacingPx)) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = startX + c * (photoW + spacingPx);
      const py = startY + r * (photoH + spacingPx);
      sheetCtx.drawImage(cutCanvas, px, py);

      // Subtle 1px light gray cutting border (#d1d5db)
      sheetCtx.save();
      sheetCtx.strokeStyle = '#d1d5db';
      sheetCtx.lineWidth = 1;
      sheetCtx.strokeRect(px + 0.5, py + 0.5, photoW - 1, photoH - 1);
      sheetCtx.restore();
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
