import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ProcessingResult } from '../types';
import { renderPdfToImages } from './pdfRenderer';

/**
 * Read total page count from a PDF file
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * 1. Merge PDF
 */
export async function mergePdf(files: File[]): Promise<ProcessingResult> {
  if (files.length === 0) {
    throw new Error('Please select at least one PDF file to merge.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);

  return {
    blob,
    url,
    fileName: 'merged_pixora.pdf',
    fileSize: blob.size,
    originalSize: totalOriginalSize,
    mimeType: 'application/pdf',
  };
}

/**
 * Parse page range string like "1-3, 5, 8-10" into 0-indexed array of indices
 */
function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * 2. Split PDF
 */
export async function splitPdf(file: File, pageRangeStr: string): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const selectedIndices = parsePageRanges(pageRangeStr, totalPages);
  if (selectedIndices.length === 0) {
    throw new Error(`Invalid page range. Please choose between 1 and ${totalPages}.`);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, selectedIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName: `${file.name.replace(/\.[^/.]+$/, '')}_split.pdf`,
    fileSize: blob.size,
    originalSize: file.size,
    mimeType: 'application/pdf',
  };
}

/**
 * 3. Extract Specific PDF Pages
 */
export async function extractPdfPages(file: File, selectedPageNumbers: number[]): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const validIndices = selectedPageNumbers
    .filter((n) => n >= 1 && n <= totalPages)
    .map((n) => n - 1);

  if (validIndices.length === 0) {
    throw new Error('Please select at least one page to extract.');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName: `${file.name.replace(/\.[^/.]+$/, '')}_extracted.pdf`,
    fileSize: blob.size,
    originalSize: file.size,
    mimeType: 'application/pdf',
  };
}

/**
 * 4. Compress PDF
 */
export async function compressPdf(file: File): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Strip duplicate annotations and unused metadata objects
  sourcePdf.setTitle('');
  sourcePdf.setAuthor('');
  sourcePdf.setSubject('');
  sourcePdf.setKeywords([]);
  sourcePdf.setProducer('Pixora Tools Optimization Engine');
  sourcePdf.setCreator('Pixora Tools');

  const pdfBytes = await sourcePdf.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName: `${file.name.replace(/\.[^/.]+$/, '')}_compressed.pdf`,
    fileSize: blob.size,
    originalSize: file.size,
    mimeType: 'application/pdf',
  };
}

/**
 * 5. Rotate PDF Pages
 */
export async function rotatePdf(
  file: File,
  angleDegrees: number, // 90, 180, 270
  applyTo: 'all' | 'odd' | 'even' = 'all'
): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = sourcePdf.getPages();

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    const shouldRotate =
      applyTo === 'all' ||
      (applyTo === 'odd' && pageNum % 2 !== 0) ||
      (applyTo === 'even' && pageNum % 2 === 0);

    if (shouldRotate) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angleDegrees) % 360));
    }
  });

  const pdfBytes = await sourcePdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName: `${file.name.replace(/\.[^/.]+$/, '')}_rotated.pdf`,
    fileSize: blob.size,
    originalSize: file.size,
    mimeType: 'application/pdf',
  };
}

/**
 * 6. PDF Watermark
 */
export async function watermarkPdf(
  file: File,
  options: {
    text: string;
    opacity: number; // 0.1 - 1.0
    size: number; // 24 - 96
    rotation: number; // e.g. 45
    colorHex: string;
  }
): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const helveticaFont = await sourcePdf.embedFont(StandardFonts.HelveticaBold);
  const pages = sourcePdf.getPages();

  // Convert hex color to rgb [0-1]
  const hex = options.colorHex.replace('#', '');
  const r = (parseInt(hex.substring(0, 2), 16) || 200) / 255;
  const g = (parseInt(hex.substring(2, 4), 16) || 200) / 255;
  const b = (parseInt(hex.substring(4, 6), 16) || 200) / 255;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = helveticaFont.widthOfTextAtSize(options.text, options.size);
    const textHeight = helveticaFont.heightAtSize(options.size);

    page.drawText(options.text, {
      x: width / 2 - (textWidth / 2) * Math.cos((options.rotation * Math.PI) / 180),
      y: height / 2 - (textHeight / 2) * Math.sin((options.rotation * Math.PI) / 180),
      size: options.size,
      font: helveticaFont,
      color: rgb(r, g, b),
      opacity: options.opacity,
      rotate: degrees(options.rotation),
    });
  }

  const pdfBytes = await sourcePdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName: `${file.name.replace(/\.[^/.]+$/, '')}_watermarked.pdf`,
    fileSize: blob.size,
    originalSize: file.size,
    mimeType: 'application/pdf',
  };
}

/**
 * 7. Images to PDF
 */
export async function imagesToPdf(
  images: File[],
  options: {
    pageSize: 'a4' | 'letter' | 'fit';
    orientation: 'portrait' | 'landscape' | 'auto';
    margin: number; // 0, 10, 20
  }
): Promise<ProcessingResult> {
  const pdfDoc = await PDFDocument.create();

  // A4: 595.28 x 841.89 points
  // Letter: 612 x 792 points
  const PAGE_SIZES = {
    a4: { w: 595.28, h: 841.89 },
    letter: { w: 612, h: 792 },
  };

  for (const file of images) {
    const imgBuffer = await file.arrayBuffer();
    const isPng = file.type === 'image/png';
    let embeddedImg;

    if (isPng) {
      embeddedImg = await pdfDoc.embedPng(imgBuffer);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBuffer);
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    let pageWidth = PAGE_SIZES.a4.w;
    let pageHeight = PAGE_SIZES.a4.h;

    if (options.pageSize === 'letter') {
      pageWidth = PAGE_SIZES.letter.w;
      pageHeight = PAGE_SIZES.letter.h;
    } else if (options.pageSize === 'fit') {
      pageWidth = imgWidth + options.margin * 2;
      pageHeight = imgHeight + options.margin * 2;
    }

    // Determine orientation
    let isLandscape = false;
    if (options.orientation === 'landscape') {
      isLandscape = true;
    } else if (options.orientation === 'auto') {
      isLandscape = imgWidth > imgHeight;
    }

    if (options.pageSize !== 'fit' && isLandscape && pageWidth < pageHeight) {
      const temp = pageWidth;
      pageWidth = pageHeight;
      pageHeight = temp;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Fit image inside margin
    const availW = pageWidth - options.margin * 2;
    const availH = pageHeight - options.margin * 2;

    const scale = Math.min(availW / imgWidth, availH / imgHeight, 1);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    const drawX = options.margin + (availW - drawW) / 2;
    const drawY = options.margin + (availH - drawH) / 2;

    page.drawImage(embeddedImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const totalOriginalSize = images.reduce((acc, f) => acc + f.size, 0);

  return {
    blob,
    url,
    fileName: 'pixora_documents.pdf',
    fileSize: blob.size,
    originalSize: totalOriginalSize,
    mimeType: 'application/pdf',
  };
}

/**
 * 8. PDF to JPG (Render each page to JPEG)
 */
export async function pdfToJpg(
  file: File,
  scale = 1.5,
  maxPages = 30
): Promise<ProcessingResult> {
  const renderedPages = await renderPdfToImages(file, scale, maxPages);
  if (renderedPages.length === 0) {
    throw new Error('Could not render pages from PDF file.');
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const pagesList: { pageNumber: number; url: string; fileName: string; fileSize: number }[] = [];

  for (const p of renderedPages) {
    const res = await fetch(p.dataUrl);
    const blob = await res.blob();
    const pageUrl = URL.createObjectURL(blob);
    pagesList.push({
      pageNumber: p.pageNumber,
      url: pageUrl,
      fileName: `${baseName}_page_${p.pageNumber}.jpg`,
      fileSize: blob.size,
    });
  }

  const firstBlob = await (await fetch(renderedPages[0].dataUrl)).blob();
  const firstUrl = URL.createObjectURL(firstBlob);

  return {
    blob: firstBlob,
    url: firstUrl,
    fileName: `${baseName}_page_1.jpg`,
    fileSize: firstBlob.size,
    originalSize: file.size,
    width: renderedPages[0].width,
    height: renderedPages[0].height,
    mimeType: 'image/jpeg',
    pages: pagesList,
  };
}

