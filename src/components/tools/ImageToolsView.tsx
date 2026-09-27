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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tool Specific Controls State
  // 1. Compression
  const [quality, setQuality] = useState<number>(0.75);
  const [compressFormat, setCompressFormat] = useState<string>('auto');

  // 2. Resize
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number>(100);

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
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(Math.max(0, updated.length - 1));
    }
    setResult(null);
  };

  // Resize dimension controls
  const handleWidthChange = (newW: number) => {
    setWidth(newW);
    if (lockAspect && originalDim.w > 0) {
      const ratio = originalDim.h / originalDim.w;
      setHeight(Math.round(newW * ratio));
    }
    setResult(null);
  };

  const handleHeightChange = (newH: number) => {
    setHeight(newH);
    if (lockAspect && originalDim.h > 0) {
      const ratio = originalDim.w / originalDim.h;
      setWidth(Math.round(newH * ratio));
    }
    setResult(null);
  };

  const handleScalePercent = (pct: number) => {
    setScalePercent(pct);
    if (originalDim.w > 0) {
      setWidth(Math.round((originalDim.w * pct) / 100));
      setHeight(Math.round((originalDim.h * pct) / 100));
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
        return await compressImage(file, q, outFormat);
      }

      case 'resize-image':
      case 'resize-image-pixels':
        return await resizeImage(file, { width: w, height: h, quality: 0.92 });

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
        setResult(res);
      } else {
        const res = await processSingleFile(currentFile, overrides);
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

  // Reset
  const handleReset = () => {
    setFiles([]);
    setActiveFileIndex(0);
    setOriginalUrl(null);
    setResult(null);
    setBatchResults({});
    setErrorMessage(null);
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
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        />
      ) : (
        <div className="space-y-6">
          {/* Multi-Image Thumbnail Ribbon */}
          {files.length > 1 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {files.length} Images Loaded
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Click any to inspect or edit)
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
            <div className="lg:col-span-5 space-y-6 rounded-3xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
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

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300">Compression Quality</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm font-bold">
                        {Math.round(quality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.98"
                      step="0.02"
                      value={quality}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setQuality(val);
                        debounceProcess({ customQuality: val }, 120);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Quality Presets */}
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { label: 'Ultra (98%)', val: 0.98 },
                      { label: 'High (85%)', val: 0.85 },
                      { label: 'Balanced (70%)', val: 0.70 },
                      { label: 'Max (45%)', val: 0.45 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setQuality(preset.val);
                          runProcessing({ customQuality: preset.val });
                        }}
                        className={`py-2 px-1 rounded-xl border text-center font-bold text-[11px] transition-all ${
                          Math.abs(quality - preset.val) < 0.04
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Output Format */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Output Format
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'auto', label: 'Original' },
                        { id: 'image/webp', label: 'WebP (Smallest)' },
                        { id: 'image/jpeg', label: 'JPEG (Universal)' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => {
                            setCompressFormat(fmt.id);
                            runProcessing({ customFormat: fmt.id });
                          }}
                          className={`p-2 rounded-xl border text-center font-bold text-xs transition-all ${
                            compressFormat === fmt.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
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
                  {/* Percentage Scale */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Quick Percentage Scale
                    </label>
                    <div className="grid grid-cols-6 gap-1.5 text-xs">
                      {[25, 50, 75, 100, 150, 200].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleScalePercent(pct)}
                          className={`py-1.5 rounded-lg border font-medium text-center transition-all ${
                            scalePercent === pct
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
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
                  <div className="grid grid-cols-5 gap-1.5 text-xs">
                    {[20, 50, 100, 200, 500].map((kb) => (
                      <button
                        key={kb}
                        onClick={() => {
                          setTargetKb(kb);
                          setResult(null);
                        }}
                        className={`py-1.5 rounded-lg border font-medium text-center transition-all ${
                          targetKb === kb
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {['16:9', '4:3', '1:1', '9:16', '3:2', '2:3', '21:9'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatioKey(ratio);
                          setResult(null);
                        }}
                        className={`p-2 rounded-xl border text-center font-semibold ${
                          aspectRatioKey === ratio
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-slate-900 dark:bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      <span>
                        {tool.id === 'image-to-pdf'
                          ? `Compile ${files.length} Images to PDF`
                          : `Process ${tool.name}`}
                      </span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
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
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs">
                    <div className="text-left space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white block truncate max-w-xs sm:max-w-sm">
                        {result.fileName}
                      </span>
                      <div className="flex items-center gap-2 text-slate-500 font-mono tabular-nums">
                        <span>{formatBytes(result.originalSize)}</span>
                        <span>→</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatBytes(result.fileSize)}
                        </span>
                        {result.fileSize < result.originalSize && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            (-{Math.round((1 - result.fileSize / result.originalSize) * 100)}%)
                          </span>
                        )}
                        {result.width && result.height && (
                          <span className="text-slate-400 hidden sm:inline">
                            · {result.width}×{result.height}px
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={result.url}
                      download={result.fileName}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Result
                    </a>
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
