import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  RefreshCw,
  Sliders,
  Check,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  RotateCw,
  FlipHorizontal,
  FileCheck,
  Eye,
  Crop,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Layers,
  FileText,
  AlertCircle,
  Sparkles,
  FileArchive,
  Loader2,
} from 'lucide-react';
import { ToolItem, ProcessingResult } from '../../types';
import { Dropzone } from '../common/Dropzone';
import {
  compressImage,
  resizeImage,
  resizeToTargetKB,
  cropImage,
  circleCrop,
  squareCrop,
  changeAspectRatio,
  rotateImage,
  flipImage,
  roundCorners,
  convertFormat,
  formatBytes,
} from '../../utils/imageProcessors';
import { imagesToPdf } from '../../utils/pdfProcessors';
import { createZipBlob, downloadBlob } from '../../utils/zipUtils';

interface ImageToolsViewProps {
  tool: ToolItem;
}

export const ImageToolsView: React.FC<ImageToolsViewProps> = ({ tool }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalDim, setOriginalDim] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [batchResults, setBatchResults] = useState<{ [index: number]: ProcessingResult }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [batchDownloadError, setBatchDownloadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tool Specific Controls State
  // 1. Compression
  const [quality, setQuality] = useState<number>(0.8);
  const [compressFormat, setCompressFormat] = useState<string>('auto');
  const [compressTargetKb, setCompressTargetKb] = useState<number | ''>('');

  // 2. Resize
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [resizeFormat, setResizeFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [resizeTargetKb, setResizeTargetKb] = useState<number | ''>('');

  // 3. Target KB
  const [targetKb, setTargetKb] = useState<number>(50);

  // 4. CM Resizer
  const [cmW, setCmW] = useState<number>(10);
  const [cmH, setCmH] = useState<number>(15);
  const [cmUnit, setCmUnit] = useState<'cm' | 'in'>('cm');
  const [dpi, setDpi] = useState<number>(300);

  // 5. Crop Box State
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  });
  const [cropPreset, setCropPreset] = useState<string>('free');

  // 6. Circle / Square Crop
  const [circleBg, setCircleBg] = useState<string>('#FFFFFF');
  const [circleTransparent, setCircleTransparent] = useState<boolean>(true);
  const [squareMode, setSquareMode] = useState<'crop' | 'pad'>('crop');
  const [squarePadColor, setSquarePadColor] = useState<string>('#FFFFFF');

  // 7. Aspect Ratio
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('16:9');
  const [aspectMode, setAspectMode] = useState<'cover' | 'contain'>('cover');
  const [aspectBgColor, setAspectBgColor] = useState<string>('#FFFFFF');

  // 8. Rotate & Flip
  const [rotateDeg, setRotateDeg] = useState<number>(90);
  const [fineAngle, setFineAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(true);
  const [flipV, setFlipV] = useState<boolean>(false);

  // 9. Round Corners
  const [cornerRadius, setCornerRadius] = useState<number>(24);
  const [roundTransparent, setRoundTransparent] = useState<boolean>(true);

  // 10. Format Conversion
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const [formatBgColor, setFormatBgColor] = useState<string>('#FFFFFF');
  const [formatQuality, setFormatQuality] = useState<number>(0.92);

  // 11. Image to PDF
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait');
  const [pdfMargin, setPdfMargin] = useState<number>(10);

  const fileInputAppendRef = useRef<HTMLInputElement>(null);
  const originalUrlRef = useRef<string | null>(null);
  const batchResultsRef = useRef<{ [index: number]: ProcessingResult }>({});
  const resultRef = useRef<ProcessingResult | null>(null);

  // Helper to safely revoke a blob URL
  const revokeBlobUrl = (url?: string | null) => {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    }
  };

  const revokeAllStoredUrls = () => {
    if (originalUrlRef.current) {
      revokeBlobUrl(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    const revoked = new Set<string>();
    Object.values(batchResultsRef.current).forEach((r) => {
      if (r?.url && !revoked.has(r.url)) {
        revokeBlobUrl(r.url);
        revoked.add(r.url);
      }
    });
    if (resultRef.current?.url && !revoked.has(resultRef.current.url)) {
      revokeBlobUrl(resultRef.current.url);
      revoked.add(resultRef.current.url);
    }
  };

  useEffect(() => {
    batchResultsRef.current = batchResults;
  }, [batchResults]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      revokeAllStoredUrls();
    };
  }, []);

  // Multi-file supported tools
  const isMultiFileSupported =
    tool.id === 'image-to-pdf' ||
    tool.id === 'compress-image' ||
    tool.id === 'jpg-to-png' ||
    tool.id === 'png-to-jpg' ||
    tool.id === 'webp-converter';

  const processTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active file into memory and auto-process
  useEffect(() => {
    if (files.length > 0 && files[activeFileIndex]) {
      const activeFile = files[activeFileIndex];
      const url = URL.createObjectURL(activeFile);
      if (originalUrlRef.current && originalUrlRef.current !== url) {
        revokeBlobUrl(originalUrlRef.current);
      }
      originalUrlRef.current = url;
      setOriginalUrl(url);

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setOriginalDim({ w, h });
        setWidth(w);
        setHeight(h);
        setScalePercent(100);

        // Initialize crop box to 80% centered
        const initCropW = Math.round(w * 0.8);
        const initCropH = Math.round(h * 0.8);
        setCropBox({
          x: Math.round((w - initCropW) / 2),
          y: Math.round((h - initCropH) / 2),
          width: initCropW,
          height: initCropH,
        });

        // Initialize CM defaults
        setCmW(parseFloat(((w / 300) * 2.54).toFixed(1)));
        setCmH(parseFloat(((h / 300) * 2.54).toFixed(1)));

        // Check if batch result already exists
        if (batchResults[activeFileIndex]) {
          setResult(batchResults[activeFileIndex]);
        } else {
          // Immediately process on load so user sees instant results
          runProcessing();
        }
      };
      img.src = url;
    }
  }, [files, activeFileIndex]);

  // Handle Initial File Selection
  const handleFilesSelected = (newFiles: File[]) => {
    setErrorMessage(null);
    if (newFiles.length === 0) return;

    // Filter valid images
    const valid = newFiles.filter((f) => {
      const isImg = f.type.startsWith('image/') || f.name.match(/\.(jpe?g|png|webp|avif|gif)$/i);
      const isPdf = tool.id === 'image-to-pdf' && (f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      return isImg || isPdf;
    });

    if (valid.length === 0) {
      setErrorMessage('Please upload valid image files (JPG, PNG, WebP, AVIF).');
      return;
    }

    revokeAllStoredUrls();
    setFiles(valid);
    setActiveFileIndex(0);
    setResult(null);
    setBatchResults({});
  };

  // Append additional files
  const handleAppendFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
      setFiles((prev) => [...prev, ...added]);
    }
  };

  // Reorder files for Image to PDF
  const moveFile = (index: number, direction: 'left' | 'right') => {
    const newFiles = [...files];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIdx];
    newFiles[targetIdx] = temp;
    setFiles(newFiles);
    setActiveFileIndex(targetIdx);
  };

  const removeFile = (index: number) => {
    // Revoke URL of the removed file's result if any
    const removedRes = batchResultsRef.current[index];
    if (removedRes?.url) {
      revokeBlobUrl(removedRes.url);
    }
    const updated = files.filter((_, i) => i !== index);
    const updatedBatchResults: { [key: number]: ProcessingResult } = {};
    let newIdx = 0;
    for (let i = 0; i < files.length; i++) {
      if (i === index) continue;
      if (batchResults[i]) {
        updatedBatchResults[newIdx] = batchResults[i];
      }
      newIdx++;
    }
    setBatchResults(updatedBatchResults);
    setFiles(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(Math.max(0, updated.length - 1));
    }
    setResult(null);
  };

  // Resize dimension controls
  const handleWidthChange = (newW: number) => {
    const val = Math.max(1, newW);
    setWidth(val);
    if (lockAspect && originalDim.w > 0) {
      const ratio = originalDim.h / originalDim.w;
      setHeight(Math.max(1, Math.round(val * ratio)));
    }
    // Gracefully sync or reset percentage chip highlight
    if (originalDim.w > 0) {
      const pct = Math.round((val / originalDim.w) * 100);
      setScalePercent([25, 50, 75, 100, 150, 200].includes(pct) ? pct : 0);
    } else {
      setScalePercent(0);
    }
    setResult(null);
  };

  const handleHeightChange = (newH: number) => {
    const val = Math.max(1, newH);
    setHeight(val);
    if (lockAspect && originalDim.h > 0) {
      const ratio = originalDim.w / originalDim.h;
      setWidth(Math.max(1, Math.round(val * ratio)));
    }
    // Gracefully sync or reset percentage chip highlight
    if (originalDim.h > 0) {
      const pct = Math.round((val / originalDim.h) * 100);
      setScalePercent([25, 50, 75, 100, 150, 200].includes(pct) ? pct : 0);
    } else {
      setScalePercent(0);
    }
    setResult(null);
  };

  const handleScalePercent = (pct: number) => {
    setScalePercent(pct);
    if (originalDim.w > 0 && originalDim.h > 0) {
      setWidth(Math.max(1, Math.round((originalDim.w * pct) / 100)));
      setHeight(Math.max(1, Math.round((originalDim.h * pct) / 100)));
    }
    setResult(null);
  };

  // Crop preset selection
  const handleCropPreset = (preset: string) => {
    setCropPreset(preset);
    if (originalDim.w === 0 || originalDim.h === 0) return;

    let targetRatio: number | null = null;
    if (preset === '1:1') targetRatio = 1;
    else if (preset === '16:9') targetRatio = 16 / 9;
    else if (preset === '4:3') targetRatio = 4 / 3;
    else if (preset === '3:2') targetRatio = 3 / 2;
    else if (preset === '9:16') targetRatio = 9 / 16;
    else if (preset === '80%') {
      const w = Math.round(originalDim.w * 0.8);
      const h = Math.round(originalDim.h * 0.8);
      setCropBox({
        x: Math.round((originalDim.w - w) / 2),
        y: Math.round((originalDim.h - h) / 2),
        width: w,
        height: h,
      });
      setResult(null);
      return;
    }

    if (targetRatio !== null) {
      let w = originalDim.w * 0.85;
      let h = w / targetRatio;
      if (h > originalDim.h) {
        h = originalDim.h * 0.85;
        w = h * targetRatio;
      }
      w = Math.round(w);
      h = Math.round(h);
      setCropBox({
        x: Math.round((originalDim.w - w) / 2),
        y: Math.round((originalDim.h - h) / 2),
        width: w,
        height: h,
      });
    }
    setResult(null);
  };

  // Process a single file with optional override parameters
  const processSingleFile = async (file: File, overrides?: {
    customQuality?: number;
    customFormat?: string;
    customCompressTargetKb?: number | '';
    customWidth?: number;
    customHeight?: number;
    customTargetKb?: number;
    customRotateDeg?: number;
    customFineAngle?: number;
    customFlipH?: boolean;
    customFlipV?: boolean;
    customCropBox?: any;
    customCornerRadius?: number;
    customTargetFormat?: any;
  }): Promise<ProcessingResult> => {
    const q = overrides?.customQuality !== undefined ? overrides.customQuality : quality;
    const cFmt = overrides?.customFormat !== undefined ? overrides.customFormat : compressFormat;
    const cTargetKb = overrides?.customCompressTargetKb !== undefined ? overrides.customCompressTargetKb : compressTargetKb;
    const w = overrides?.customWidth !== undefined ? overrides.customWidth : width;
    const h = overrides?.customHeight !== undefined ? overrides.customHeight : height;
    const tKb = overrides?.customTargetKb !== undefined ? overrides.customTargetKb : targetKb;
    const rot = overrides?.customRotateDeg !== undefined ? overrides.customRotateDeg : rotateDeg;
    const fAngle = overrides?.customFineAngle !== undefined ? overrides.customFineAngle : fineAngle;
    const fH = overrides?.customFlipH !== undefined ? overrides.customFlipH : flipH;
    const fV = overrides?.customFlipV !== undefined ? overrides.customFlipV : flipV;
    const cRadius = overrides?.customCornerRadius !== undefined ? overrides.customCornerRadius : cornerRadius;
    const cBox = overrides?.customCropBox !== undefined ? overrides.customCropBox : cropBox;
    const tFmt = overrides?.customTargetFormat !== undefined ? overrides.customTargetFormat : targetFormat;

    switch (tool.id) {
      case 'compress-image': {
        const outFormat = cFmt === 'auto' ? file.type || 'image/jpeg' : cFmt;
        const targetK = typeof cTargetKb === 'number' && cTargetKb > 0 ? cTargetKb : undefined;
        return await compressImage(file, q, outFormat, targetK);
      }

      case 'resize-image':
      case 'resize-image-pixels':
        return await resizeImage(file, {
          width: w,
          height: h,
          format: resizeFormat,
          targetKb: typeof resizeTargetKb === 'number' && resizeTargetKb > 0 ? resizeTargetKb : undefined,
          quality: 0.92,
        });

      case 'resize-image-kb':
        return await resizeToTargetKB(file, tKb);

      case 'resize-image-cm': {
        const factor = cmUnit === 'in' ? 1 : 1 / 2.54;
        const pxW = Math.max(1, Math.round(cmW * factor * dpi));
        const pxH = Math.max(1, Math.round(cmH * factor * dpi));
        return await resizeImage(file, { width: pxW, height: pxH, quality: 0.95 });
      }

      case 'crop-image':
        return await cropImage(file, cBox, file.type || 'image/jpeg');

      case 'circle-crop':
        return await circleCrop(file, {
          bgColor: circleBg,
          transparent: circleTransparent,
        });

      case 'square-crop':
        return await squareCrop(file, {
          mode: squareMode,
          bgColor: squarePadColor,
        });

      case 'aspect-ratio':
      case 'change-aspect-ratio': {
        const [rw, rh] = aspectRatioKey.split(':').map(Number);
        return await changeAspectRatio(file, rw, rh, aspectMode, aspectBgColor);
      }

      case 'rotate-image':
        return await rotateImage(file, fAngle !== 0 ? fAngle : rot);

      case 'flip-image':
        return await flipImage(file, fH, fV);

      case 'round-corners':
        return await roundCorners(file, cRadius, roundTransparent);

      case 'jpg-to-png':
        return await convertFormat(file, 'image/png');

      case 'png-to-jpg':
        return await convertFormat(file, 'image/jpeg', formatQuality, formatBgColor);

      case 'webp-converter':
        return await convertFormat(file, tFmt, formatQuality);

      default:
        return await compressImage(file, 0.85);
    }
  };

  // Immediate Processing Helper
  const runProcessing = async (overrides?: any) => {
    if (files.length === 0) return;
    const currentFile = files[activeFileIndex];
    if (!currentFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (tool.id === 'image-to-pdf') {
        const res = await imagesToPdf(files, {
          pageSize: overrides?.customPdfPageSize ?? pdfPageSize,
          orientation: overrides?.customPdfOrientation ?? pdfOrientation,
          margin: overrides?.customPdfMargin ?? pdfMargin,
        });
        if (resultRef.current?.url && resultRef.current.url !== res.url) {
          revokeBlobUrl(resultRef.current.url);
        }
        resultRef.current = res;
        setResult(res);
      } else {
        const res = await processSingleFile(currentFile, overrides);
        // Synchronously revoke previous blob URL for this tool/image run
        if (resultRef.current?.url && resultRef.current.url !== res.url) {
          revokeBlobUrl(resultRef.current.url);
        }
        const prevForIndex = batchResultsRef.current[activeFileIndex]?.url;
        if (prevForIndex && prevForIndex !== res.url && prevForIndex !== resultRef.current?.url) {
          revokeBlobUrl(prevForIndex);
        }
        resultRef.current = res;
        setResult(res);
        setBatchResults((prev) => ({ ...prev, [activeFileIndex]: res }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Processing failed. Please check parameters.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct binary blob download handler (ensures byte-for-byte consistency with displayed UI size)
  const handleDownloadResult = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!result || !result.blob) return;
    e.preventDefault();
    const downloadBlobUrl = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = downloadBlobUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadBlobUrl), 1000);
  };

  // Debounced Processing Helper
  const debounceProcess = (overrides?: any, delay = 140) => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current);
    processTimerRef.current = setTimeout(() => {
      runProcessing(overrides);
    }, delay);
  };

  // Main Action Handler (manual trigger)
  const handleProcess = async () => {
    await runProcessing();
  };

  // Batch Process All files (if multiple files exist)
  const handleBatchProcessAll = async () => {
    if (files.length <= 1) {
      await handleProcess();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const newResults: { [index: number]: ProcessingResult } = {};

    try {
      for (let i = 0; i < files.length; i++) {
        const r = await processSingleFile(files[i]);
        const oldUrl = batchResultsRef.current[i]?.url;
        if (oldUrl && oldUrl !== r.url) {
          revokeBlobUrl(oldUrl);
        }
        newResults[i] = r;
      }
      setBatchResults(newResults);
      setResult(newResults[activeFileIndex]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Batch processing error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download All Processed Batch Results as a ZIP archive
  const handleDownloadAllBatch = async () => {
    // Collect all valid available results
    const availableResults: ProcessingResult[] = [];
    for (let i = 0; i < files.length; i++) {
      if (batchResults[i]) {
        availableResults.push(batchResults[i]);
      }
    }

    // If active single result is available but not in batchResults, include it
    if (availableResults.length === 0 && result) {
      availableResults.push(result);
    }

    if (availableResults.length === 0) {
      setBatchDownloadError('No processed results available to download.');
      return;
    }

    setIsDownloadingZip(true);
    setBatchDownloadError(null);

    try {
      const zipInputs = await Promise.all(
        availableResults.map(async (res, idx) => {
          let dataBlob: Blob;
          if (res.blob) {
            dataBlob = res.blob;
          } else {
            const resp = await fetch(res.url);
            dataBlob = await resp.blob();
          }
          const filename = res.fileName || `processed_image_${idx + 1}.png`;
          return {
            name: filename,
            data: dataBlob,
          };
        })
      );

      const zipBlob = await createZipBlob(zipInputs);
      const zipName = `${tool.id || 'pixora'}_batch_results.zip`;
      downloadBlob(zipBlob, zipName);
    } catch (err: any) {
      console.error('Batch download failed:', err);
      setBatchDownloadError('Failed to prepare combined ZIP download. Please download files individually.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Reset
  const handleReset = () => {
    revokeAllStoredUrls();
    setFiles([]);
    setActiveFileIndex(0);
    setOriginalUrl(null);
    setResult(null);
    setBatchResults({});
    setErrorMessage(null);
    setBatchDownloadError(null);
  };

  const activeFile = files[activeFileIndex];

  return (
    <div className="space-y-8">
      {files.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesSelected}
          multiple={isMultiFileSupported}
          title={`Upload ${isMultiFileSupported ? 'Images' : 'Image'}`}
          subtitle={`Drag & drop JPG, PNG, WebP, AVIF ${isMultiFileSupported ? '(Multiple files supported)' : ''}`}
          formatsText={
            tool.id === 'image-to-pdf'
              ? 'Supports JPG, PNG, WebP, AVIF, PDF (Up to 50MB)'
              : 'Supports JPG, PNG, WebP, AVIF (Up to 50MB)'
          }
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        />
      ) : (
        <div className="space-y-6">
          {/* Multi-Image Thumbnail Ribbon */}
          {files.length > 1 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {files.length} Images Loaded
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium hidden xs:inline">
                    (Click any to inspect or edit)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputAppendRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleAppendFiles}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputAppendRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Plus className="h-3 w-3" /> Add More
                  </button>

                  {tool.id !== 'image-to-pdf' && (
                    <button
                      onClick={handleBatchProcessAll}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" /> Process All ({files.length})
                    </button>
                  )}

                  {/* Download All Processed Files as ZIP */}
                  {Object.keys(batchResults).length > 1 && (
                    <button
                      onClick={handleDownloadAllBatch}
                      disabled={isDownloadingZip}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      title="Download all processed files as a ZIP archive"
                    >
                      {isDownloadingZip ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Packaging ZIP...
                        </>
                      ) : (
                        <>
                          <FileArchive className="h-3 w-3" /> Download All ({Object.keys(batchResults).length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="flex gap-3 overflow-x-auto pt-3 pb-1">
                {files.map((f, idx) => {
                  const isActive = idx === activeFileIndex;
                  const isDone = Boolean(batchResults[idx]);
                  const thumbUrl = URL.createObjectURL(f);

                  return (
                    <div
                      key={`${f.name}-${idx}`}
                      className={`relative group shrink-0 w-28 rounded-xl border p-1.5 transition-all text-left cursor-pointer ${
                        isActive
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                      onClick={() => setActiveFileIndex(idx)}
                    >
                      <div className="relative h-16 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <img
                          src={thumbUrl}
                          alt={f.name}
                          className="h-full w-full object-cover"
                        />
                        {isDone && (
                          <span className="absolute top-1 right-1 rounded-full bg-emerald-600 p-0.5 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {f.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {formatBytes(f.size)}
                      </p>

                      {/* PDF Sequence Controls */}
                      {tool.id === 'image-to-pdf' && (
                        <div className="mt-1 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1 text-[10px]">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFile(idx, 'left');
                            }}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move earlier in PDF"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                          <span className="font-bold text-slate-500">{idx + 1}</span>
                          <button
                            disabled={idx === files.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFile(idx, 'right');
                            }}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move later in PDF"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workstation Grid: Left Controls, Right Preview & Results */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls Panel */}
            <div className="lg:col-span-5 space-y-6 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {tool.name} Settings
                </h3>
                {activeFile && (
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {originalDim.w} × {originalDim.h} px
                  </span>
                )}
              </div>

              {/* 1. Compress Image Controls */}
              {tool.id === 'compress-image' && (
                <div className="space-y-4">
                  {/* Smooth Quality Slider (10% to 100%, default 80%) */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300">Compression Quality</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm font-bold">
                        {Math.round(quality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.0"
                      step="0.01"
                      value={quality}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setQuality(val);
                        setCompressTargetKb('');
                        debounceProcess({ customQuality: val, customCompressTargetKb: '' }, 100);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>10% (Min size)</span>
                      <span>50%</span>
                      <span>80% (Default)</span>
                      <span>100% (High quality)</span>
                    </div>
                  </div>

                  {/* Quick Preset Chips */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Compression Presets
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'Max Compression (low KB)', val: 0.45, desc: 'Smallest file size' },
                        { label: 'Balanced (Recommended)', val: 0.80, desc: 'Ideal quality & ratio' },
                        { label: 'High Quality', val: 0.95, desc: 'Minimal compression' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setQuality(preset.val);
                            setCompressTargetKb('');
                            runProcessing({ customQuality: preset.val, customCompressTargetKb: '' });
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            compressTargetKb === '' && Math.abs(quality - preset.val) < 0.05
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="font-bold text-xs">{preset.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Target Size (KB) Input */}
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Target File Size (KB) <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      {compressTargetKb !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompressTargetKb('');
                            runProcessing({ customCompressTargetKb: '', customQuality: quality });
                          }}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          Reset to Slider
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="10"
                          max="25000"
                          placeholder="e.g. 50, 100, 200"
                          value={compressTargetKb}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                            setCompressTargetKb(val);
                            debounceProcess({ customCompressTargetKb: val }, 250);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                          KB
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[50, 100, 200].map((quickKb) => (
                          <button
                            key={quickKb}
                            type="button"
                            onClick={() => {
                              setCompressTargetKb(quickKb);
                              runProcessing({ customCompressTargetKb: quickKb });
                            }}
                            className={`rounded-lg border px-2.5 py-2 text-xs font-mono font-medium transition-all ${
                              compressTargetKb === quickKb
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            {quickKb}KB
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Auto-calculates compression quality and step-down scale in pure browser memory to reach your target size.
                    </p>
                  </div>

                  {/* Output Format */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Output Format
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'auto', label: 'Original Format' },
                        { id: 'image/webp', label: 'WebP (Smallest)' },
                        { id: 'image/jpeg', label: 'JPEG (Universal)' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => {
                            setCompressFormat(fmt.id);
                            runProcessing({ customFormat: fmt.id });
                          }}
                          className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                            compressFormat === fmt.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Resize Image & Resize Image by Pixels */}
              {(tool.id === 'resize-image' || tool.id === 'resize-image-pixels') && (
                <div className="space-y-4">
                  {/* Quick Percentage Scale */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Quick Percentage Scale
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                      {[25, 50, 75, 100, 150, 200].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleScalePercent(pct)}
                          className={`py-2 sm:py-1.5 rounded-lg border font-medium text-center transition-all ${
                            scalePercent === pct
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset Dimensions Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Dimension Preset
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val || val === 'custom') return;
                        const [w, h] = val.split('x').map(Number);
                        if (w && h) {
                          setWidth(w);
                          setHeight(h);
                          setScalePercent(0);
                          setResult(null);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="custom">Custom Dimensions</option>
                      <option value="1080x1080">Instagram Square (1080 × 1080 px)</option>
                      <option value="1080x1920">Instagram Story / Reel (1080 × 1920 px)</option>
                      <option value="1280x720">Standard Web / YouTube (1280 × 720 px)</option>
                      <option value="1920x1080">Full HD Landscape (1920 × 1080 px)</option>
                      <option value="413x531">Passport Photo (413 × 531 px)</option>
                    </select>
                  </div>

                  {/* Pixel Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={width}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={height}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Lock Aspect Ratio */}
                  <button
                    type="button"
                    onClick={() => setLockAspect(!lockAspect)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                  >
                    {lockAspect ? (
                      <Lock className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>Maintain Aspect Ratio ({lockAspect ? 'Locked' : 'Unlocked'})</span>
                  </button>

                  {/* Output Format & Target Size (KB) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Output Format */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Output Format
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {[
                          { id: 'image/jpeg', label: 'JPG' },
                          { id: 'image/png', label: 'PNG' },
                          { id: 'image/webp', label: 'WebP' },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => {
                              setResizeFormat(fmt.id as any);
                              setResult(null);
                            }}
                            className={`py-1.5 rounded-lg border text-center font-medium transition-all ${
                              resizeFormat === fmt.id
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-bold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {fmt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Size (KB) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Target Size (KB)
                        </label>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 50, 100"
                          value={resizeTargetKb}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10));
                            setResizeTargetKb(val);
                            setResult(null);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        />
                        {typeof resizeTargetKb === 'number' && resizeTargetKb > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setResizeTargetKb('');
                              setResult(null);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Resize Image by KB */}
              {tool.id === 'resize-image-kb' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Target Maximum File Size
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="5000"
                        value={targetKb}
                        onChange={(e) => {
                          setTargetKb(Math.max(5, parseInt(e.target.value, 10) || 5));
                          setResult(null);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 pr-12 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                        KB
                      </span>
                    </div>
                  </div>

                  {/* KB Presets */}
                  <div className="grid grid-cols-3 xs:grid-cols-5 gap-1.5 text-xs">
                    {[20, 50, 100, 200, 500].map((kb) => (
                      <button
                        key={kb}
                        onClick={() => {
                          setTargetKb(kb);
                          setResult(null);
                        }}
                        className={`py-2 px-1 rounded-lg border font-medium text-center transition-all min-h-[36px] flex items-center justify-center ${
                          targetKb === kb
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-bold shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {kb} KB
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Uses binary search compression to reach or stay strictly under your exact KB limit.
                  </p>
                </div>
              )}

              {/* 4. Resize Image by Centimeters */}
              {tool.id === 'resize-image-cm' && (
                <div className="space-y-4">
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setCmUnit('cm')}
                      className={`flex-1 py-1.5 rounded-lg border font-medium ${
                        cmUnit === 'cm'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Centimeters (cm)
                    </button>
                    <button
                      onClick={() => setCmUnit('in')}
                      className={`flex-1 py-1.5 rounded-lg border font-medium ${
                        cmUnit === 'in'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Inches (in)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Width ({cmUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={cmW}
                        onChange={(e) => {
                          setCmW(parseFloat(e.target.value) || 1);
                          setResult(null);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Height ({cmUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={cmH}
                        onChange={(e) => {
                          setCmH(parseFloat(e.target.value) || 1);
                          setResult(null);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* DPI Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Target Resolution (DPI)
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { dpi: 300, label: '300 DPI (Print)' },
                        { dpi: 150, label: '150 DPI (Screen)' },
                        { dpi: 72, label: '72 DPI (Web)' },
                      ].map((item) => (
                        <button
                          key={item.dpi}
                          onClick={() => {
                            setDpi(item.dpi);
                            setResult(null);
                          }}
                          className={`p-2 rounded-xl border text-center font-medium ${
                            dpi === item.dpi
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Pixel Readout */}
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <span className="font-semibold block">Calculated Result Pixels:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round(cmW * (cmUnit === 'in' ? 1 : 1 / 2.54) * dpi)} ×{' '}
                      {Math.round(cmH * (cmUnit === 'in' ? 1 : 1 / 2.54) * dpi)} px
                    </span>
                  </div>
                </div>
              )}

              {/* 5. Crop Image Controls */}
              {tool.id === 'crop-image' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Crop Ratio Presets
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {['free', '1:1', '16:9', '4:3', '3:2', '80%'].map((p) => (
                        <button
                          key={p}
                          onClick={() => handleCropPreset(p)}
                          className={`p-2 rounded-xl border text-center font-semibold capitalize ${
                            cropPreset === p
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {p === '80%' ? 'Center 80%' : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crop Dimension Sliders */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        <span>Crop Width</span>
                        <span className="font-mono text-indigo-600">{cropBox.width} px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max={originalDim.w || 1000}
                        value={cropBox.width}
                        onChange={(e) => {
                          const w = parseInt(e.target.value, 10);
                          setCropBox((prev) => ({
                            ...prev,
                            width: w,
                            x: Math.min(prev.x, (originalDim.w || 1000) - w),
                          }));
                          setResult(null);
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        <span>Crop Height</span>
                        <span className="font-mono text-indigo-600">{cropBox.height} px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max={originalDim.h || 1000}
                        value={cropBox.height}
                        onChange={(e) => {
                          const h = parseInt(e.target.value, 10);
                          setCropBox((prev) => ({
                            ...prev,
                            height: h,
                            y: Math.min(prev.y, (originalDim.h || 1000) - h),
                          }));
                          setResult(null);
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          <span>X Offset</span>
                          <span className="font-mono text-slate-500">{cropBox.x} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0, originalDim.w - cropBox.width)}
                          value={cropBox.x}
                          onChange={(e) => {
                            setCropBox((prev) => ({ ...prev, x: parseInt(e.target.value, 10) }));
                            setResult(null);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          <span>Y Offset</span>
                          <span className="font-mono text-slate-500">{cropBox.y} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0, originalDim.h - cropBox.height)}
                          value={cropBox.y}
                          onChange={(e) => {
                            setCropBox((prev) => ({ ...prev, y: parseInt(e.target.value, 10) }));
                            setResult(null);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Circle Crop */}
              {tool.id === 'circle-crop' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={circleTransparent}
                      onChange={(e) => {
                        setCircleTransparent(e.target.checked);
                        setResult(null);
                      }}
                      className="accent-indigo-600 h-4 w-4 rounded"
                    />
                    <span>Export Transparent Outer Background (PNG)</span>
                  </label>

                  {!circleTransparent && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Outer Background Fill Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={circleBg}
                          onChange={(e) => {
                            setCircleBg(e.target.value);
                            setResult(null);
                          }}
                          className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                        />
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          {circleBg}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Cuts the image into a circular profile avatar with smooth anti-aliased edges.
                  </p>
                </div>
              )}

              {/* 7. Square Crop */}
              {tool.id === 'square-crop' && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Square Conversion Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setSquareMode('crop');
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium ${
                        squareMode === 'crop'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Center Crop to 1:1
                    </button>
                    <button
                      onClick={() => {
                        setSquareMode('pad');
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium ${
                        squareMode === 'pad'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Fit & Pad (No Cut)
                    </button>
                  </div>

                  {squareMode === 'pad' && (
                    <div className="pt-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Padding Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={squarePadColor}
                          onChange={(e) => {
                            setSquarePadColor(e.target.value);
                            setResult(null);
                          }}
                          className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                        />
                        <span className="text-xs font-mono">{squarePadColor}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 8. Change Aspect Ratio */}
              {(tool.id === 'aspect-ratio' || tool.id === 'change-aspect-ratio') && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Target Proportions
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    {['16:9', '4:3', '1:1', '9:16', '3:2', '2:3', '21:9'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatioKey(ratio);
                          setResult(null);
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl border text-center font-semibold min-h-[38px] flex items-center justify-center transition-all ${
                          aspectRatioKey === ratio
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <button
                      onClick={() => {
                        setAspectMode('cover');
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium ${
                        aspectMode === 'cover'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Cover & Fill (Crop)
                    </button>
                    <button
                      onClick={() => {
                        setAspectMode('contain');
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium ${
                        aspectMode === 'contain'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Fit & Letterbox
                    </button>
                  </div>
                </div>
              )}

              {/* 9. Rotate Image */}
              {tool.id === 'rotate-image' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { deg: 90, label: '90° Right' },
                      { deg: -90, label: '90° Left' },
                      { deg: 180, label: '180° Flip' },
                    ].map((rot) => (
                      <button
                        key={rot.deg}
                        onClick={() => {
                          setRotateDeg(rot.deg);
                          setFineAngle(0);
                          setResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-medium ${
                          rotateDeg === rot.deg && fineAngle === 0
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rot.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      <span>Fine Horizon Straightening</span>
                      <span className="text-indigo-600 font-mono">{fineAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={fineAngle}
                      onChange={(e) => {
                        setFineAngle(parseInt(e.target.value, 10));
                        setResult(null);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* 10. Flip Image */}
              {tool.id === 'flip-image' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Flip Axis
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setFlipH(!flipH);
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border font-medium flex items-center justify-center gap-1.5 ${
                        flipH
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <FlipHorizontal className="h-4 w-4" /> Flip Horizontal
                    </button>
                    <button
                      onClick={() => {
                        setFlipV(!flipV);
                        setResult(null);
                      }}
                      className={`p-2.5 rounded-xl border font-medium flex items-center justify-center gap-1.5 ${
                        flipV
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Flip Vertical
                    </button>
                  </div>
                </div>
              )}

              {/* 11. Round Corners */}
              {tool.id === 'round-corners' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Corner Radius</span>
                    <span className="text-indigo-600 font-mono text-sm">{cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="160"
                    value={cornerRadius}
                    onChange={(e) => {
                      setCornerRadius(parseInt(e.target.value, 10));
                      setResult(null);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roundTransparent}
                      onChange={(e) => {
                        setRoundTransparent(e.target.checked);
                        setResult(null);
                      }}
                      className="accent-indigo-600 h-4 w-4 rounded"
                    />
                    <span>Export Transparent PNG Border</span>
                  </label>
                </div>
              )}

              {/* 12. PNG to JPG Background Color */}
              {tool.id === 'png-to-jpg' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Background Fill Color (for transparent areas)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formatBgColor}
                        onChange={(e) => {
                          setFormatBgColor(e.target.value);
                          setResult(null);
                        }}
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                      />
                      <span className="text-xs font-mono">{formatBgColor}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      <span>JPEG Quality</span>
                      <span className="font-mono text-indigo-600">{Math.round(formatQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="1.0"
                      step="0.05"
                      value={formatQuality}
                      onChange={(e) => {
                        setFormatQuality(parseFloat(e.target.value));
                        setResult(null);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* 13. WebP Converter */}
              {tool.id === 'webp-converter' && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Target Format
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { mime: 'image/webp', label: 'WebP (Next-Gen)' },
                      { mime: 'image/png', label: 'PNG (Lossless)' },
                      { mime: 'image/jpeg', label: 'JPG (Universal)' },
                    ].map((fmt) => (
                      <button
                        key={fmt.mime}
                        onClick={() => {
                          setTargetFormat(fmt.mime as any);
                          setResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-medium ${
                          targetFormat === fmt.mime
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 14. Image to PDF Controls */}
              {tool.id === 'image-to-pdf' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      PDF Page Size
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {['a4', 'letter', 'fit'].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => {
                            setPdfPageSize(sz as any);
                            setResult(null);
                          }}
                          className={`p-2 rounded-xl border uppercase font-semibold ${
                            pdfPageSize === sz
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sz === 'fit' ? 'Fit Image' : sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Page Orientation
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {['portrait', 'landscape', 'auto'].map((ori) => (
                        <button
                          key={ori}
                          onClick={() => {
                            setPdfOrientation(ori as any);
                            setResult(null);
                          }}
                          className={`p-2 rounded-xl border capitalize font-medium ${
                            pdfOrientation === ori
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {ori}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message banner */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Process & Reset Action Buttons */}
              <div className="pt-2 flex flex-col xs:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {tool.id === 'image-to-pdf'
                          ? `Compile ${files.length} Images to PDF`
                          : `Process ${tool.name}`}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Preview & Results Stage */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60 text-center">
                <div className="flex items-center justify-between pb-3 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {result ? 'Processed Result Preview' : 'Source Image Preview'}
                  </span>
                  {activeFile && (
                    <span className="text-slate-400 font-mono tabular-nums">
                      {formatBytes(activeFile.size)} · {activeFile.type || 'image/jpeg'}
                    </span>
                  )}
                </div>

                {/* Canvas Display with Checkered Backing */}
                <div className="relative overflow-hidden rounded-2xl bg-checkered p-4 shadow-2xs border border-slate-200/60 dark:border-slate-800 min-h-[320px] flex items-center justify-center">
                  {/* If Crop Tool and no result yet, show live crop overlay frame */}
                  {tool.id === 'crop-image' && !result && originalUrl && originalDim.w > 0 ? (
                    <div className="relative inline-block max-h-[500px]">
                      <img
                        src={originalUrl}
                        alt="To Crop"
                        className="max-h-[480px] w-auto object-contain mx-auto rounded-lg select-none pointer-events-none"
                      />
                      {/* Visual Crop Box Overlay */}
                      <div
                        className="absolute border-2 border-indigo-500 bg-indigo-500/15 pointer-events-none shadow-sm"
                        style={{
                          left: `${(cropBox.x / originalDim.w) * 100}%`,
                          top: `${(cropBox.y / originalDim.h) * 100}%`,
                          width: `${(cropBox.width / originalDim.w) * 100}%`,
                          height: `${(cropBox.height / originalDim.h) * 100}%`,
                        }}
                      >
                        <span className="absolute top-1 left-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow-xs">
                          {cropBox.width} × {cropBox.height}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={result ? result.url : originalUrl!}
                      alt="Preview"
                      className="max-h-[500px] w-auto object-contain mx-auto rounded-lg shadow-2xs"
                    />
                  )}
                </div>

                {/* Result Information & Download Button */}
                {result && (
                  (() => {
                    const actualBlobBytes = result.blob ? result.blob.size : result.fileSize;
                    const formatSizeDisplay = (bytes: number): string => {
                      if (bytes < 1024) return `${bytes} B`;
                      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                    };

                    return (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs">
                        <div className="text-left space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white block truncate max-w-xs sm:max-w-sm">
                            {result.fileName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-slate-500 font-mono tabular-nums">
                            <span>{formatSizeDisplay(result.originalSize)}</span>
                            <span>→</span>
                            {actualBlobBytes < result.originalSize ? (
                              <>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                  {formatSizeDisplay(actualBlobBytes)}
                                </span>
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                  (-{Math.round((1 - actualBlobBytes / result.originalSize) * 100)}%)
                                </span>
                              </>
                            ) : actualBlobBytes > result.originalSize ? (
                              <>
                                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                                  {formatSizeDisplay(actualBlobBytes)}
                                </span>
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                  (+{Math.round((actualBlobBytes / result.originalSize - 1) * 100)}%)
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {formatSizeDisplay(actualBlobBytes)} (Same)
                              </span>
                            )}
                            {result.width && result.height && (
                              <span className="text-slate-400 hidden sm:inline">
                                · {result.width}×{result.height}px
                              </span>
                            )}
                            {result.blob?.type && (
                              <span className="rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                {result.blob.type.replace('image/', '')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          {/* Secondary Download All button if multiple results are ready */}
                          {Object.keys(batchResults).length > 1 && (
                            <button
                              type="button"
                              onClick={handleDownloadAllBatch}
                              disabled={isDownloadingZip}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors min-h-[42px]"
                            >
                              {isDownloadingZip ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                  Packaging ZIP...
                                </>
                              ) : (
                                <>
                                  <FileArchive className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                  Download All ({Object.keys(batchResults).length} ZIP)
                                </>
                              )}
                            </button>
                          )}

                          <a
                            href={result.url}
                            download={result.fileName}
                            onClick={handleDownloadResult}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors min-h-[42px]"
                          >
                            <Download className="h-4 w-4" />
                            {tool.id === 'compress-image' ? 'Download Compressed Image' : 'Download Result'}
                          </a>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Batch Download Error Banner */}
                {batchDownloadError && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{batchDownloadError}</span>
                    </div>
                    <button
                      onClick={() => setBatchDownloadError(null)}
                      className="ml-2 font-bold text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
