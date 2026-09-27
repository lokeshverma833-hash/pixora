import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  RefreshCw,
  Sliders,
  Check,
  Layers,
  Split,
  FileArchive,
  RotateCw,
  Stamp,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  FileCheck,
  AlertCircle,
  Eye,
  Plus,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { ToolItem, ProcessingResult } from '../../types';
import { Dropzone } from '../common/Dropzone';
import {
  mergePdf,
  splitPdf,
  compressPdf,
  extractPdfPages,
  rotatePdf,
  watermarkPdf,
  getPdfPageCount,
  imagesToPdf,
  pdfToJpg,
} from '../../utils/pdfProcessors';
import { renderPdfToImages, RenderedPdfPage } from '../../utils/pdfRenderer';
import { formatBytes } from '../../utils/imageProcessors';

interface PdfToolsViewProps {
  tool: ToolItem;
}

export const PdfToolsView: React.FC<PdfToolsViewProps> = ({ tool }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number>(1);
  const [pagePreviews, setPagePreviews] = useState<RenderedPdfPage[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageRangeStr, setPageRangeStr] = useState<string>('1-2');

  // Rotate tool state
  const [rotateAngle, setRotateAngle] = useState<number>(90);
  const [rotateTarget, setRotateTarget] = useState<'all' | 'odd' | 'even'>('all');

  // Watermark tool state
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkSize, setWatermarkSize] = useState<number>(48);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkColor, setWatermarkColor] = useState<string>('#94A3B8');

  // JPG to PDF state
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait');
  const [pdfMargin, setPdfMargin] = useState<number>(10);

  // Processing, progress & results
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appendInputRef = useRef<HTMLInputElement>(null);

  const isJpgToPdf = tool.id === 'jpg-to-pdf';
  const isMerge = tool.id === 'merge-pdf';

  // Load files handler with validation
  const handleFiles = async (newFiles: File[]) => {
    setErrorMessage(null);
    if (newFiles.length === 0) return;

    if (isJpgToPdf) {
      // Validate image types
      const valid = newFiles.filter((f) => f.type.startsWith('image/'));
      if (valid.length === 0) {
        setErrorMessage('Please upload image files (JPG, PNG, WebP) for JPG to PDF conversion.');
        return;
      }
      setFiles(valid);
      setResult(null);
      return;
    }

    // Validate PDF type
    const valid = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (valid.length === 0) {
      setErrorMessage('Please upload valid PDF documents (.pdf).');
      return;
    }

    setFiles(valid);
    setResult(null);
    setPagePreviews([]);

    // Load PDF structure and render page previews
    const firstPdf = valid[0];
    try {
      setIsLoadingPreviews(true);
      const count = await getPdfPageCount(firstPdf);
      setPageCount(count);
      setSelectedPages(Array.from({ length: count }, (_, i) => i + 1));
      setPageRangeStr(`1-${Math.min(count, 3)}`);

      // Render thumbnails for visual preview
      const rendered = await renderPdfToImages(firstPdf, 0.75, 16);
      setPagePreviews(rendered);
    } catch (err) {
      console.warn('Could not read PDF previews:', err);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  // Append additional files
  const handleAppendFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...added]);
    }
  };

  // Reorder file sequence for Merge PDF or JPG to PDF
  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFiles.length) return;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIdx];
    newFiles[targetIdx] = temp;
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setResult(null);
      setPagePreviews([]);
    }
  };

  // Toggle page selection for Extract Pages
  const togglePageSelection = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter((p) => p !== pageNum));
    } else {
      setSelectedPages([...selectedPages, pageNum].sort((a, b) => a - b));
    }
    setResult(null);
  };

  // Process Action Handler
  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(15);
    setProgressStatus('Reading PDF document structure...');

    try {
      let res: ProcessingResult | null = null;
      const file = files[0];

      switch (tool.id) {
        case 'merge-pdf':
          setProgress(40);
          setProgressStatus(`Merging ${files.length} PDF documents...`);
          res = await mergePdf(files);
          break;

        case 'split-pdf':
          setProgress(45);
          setProgressStatus(`Splitting pages (${pageRangeStr})...`);
          res = await splitPdf(file, pageRangeStr);
          break;

        case 'compress-pdf':
          setProgress(50);
          setProgressStatus('Optimizing internal streams and stripping redundant tables...');
          res = await compressPdf(file);
          break;

        case 'extract-pdf-pages':
          setProgress(45);
          setProgressStatus(`Extracting ${selectedPages.length} selected pages...`);
          res = await extractPdfPages(file, selectedPages);
          break;

        case 'rotate-pdf':
          setProgress(50);
          setProgressStatus(`Rotating pages by ${rotateAngle}°...`);
          res = await rotatePdf(file, rotateAngle, rotateTarget);
          break;

        case 'pdf-watermark':
          setProgress(50);
          setProgressStatus(`Applying watermark "${watermarkText}"...`);
          res = await watermarkPdf(file, {
            text: watermarkText,
            opacity: watermarkOpacity,
            size: watermarkSize,
            rotation: watermarkRotation,
            colorHex: watermarkColor,
          });
          break;

        case 'jpg-to-pdf':
          setProgress(50);
          setProgressStatus(`Converting ${files.length} images to ${pdfPageSize.toUpperCase()} PDF...`);
          res = await imagesToPdf(files, {
            pageSize: pdfPageSize,
            orientation: pdfOrientation,
            margin: pdfMargin,
          });
          break;

        case 'pdf-to-jpg':
          setProgress(40);
          setProgressStatus('Rasterizing PDF pages to high-resolution JPEG...');
          res = await pdfToJpg(file, 1.75);
          break;

        default:
          res = await compressPdf(file);
          break;
      }

      setProgress(95);
      setProgressStatus('Finalizing document...');
      setTimeout(() => {
        setResult(res);
        setProgress(100);
        setProgressStatus('Complete!');
        setIsProcessing(false);
      }, 200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Processing failed. Please check the PDF document.');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPageCount(1);
    setPagePreviews([]);
    setResult(null);
    setErrorMessage(null);
    setProgress(0);
  };

  return (
    <div className="space-y-8">
      {files.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFiles}
          multiple={isMerge || isJpgToPdf}
          accept={isJpgToPdf ? 'image/jpeg,image/png,image/webp,image/avif' : 'application/pdf'}
          title={
            isJpgToPdf
              ? 'Upload Images for PDF'
              : isMerge
              ? 'Upload Multiple PDFs to Merge'
              : `Upload PDF for ${tool.name}`
          }
          subtitle={
            isMerge
              ? 'Select two or more PDF files to combine in sequence'
              : isJpgToPdf
              ? 'Combine JPG, PNG, and WebP images into a single PDF document'
              : 'All document operations run securely inside your browser memory'
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Workstation Grid: Controls & Visual Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls Column */}
            <div className="lg:col-span-5 space-y-6 rounded-3xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {tool.name} Settings
                </h3>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {files.length === 1 ? `${pageCount} Pages` : `${files.length} Files`}
                </span>
              </div>

              {/* 1. Merge PDF File List & Reordering */}
              {tool.id === 'merge-pdf' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Document Sequence ({files.length} PDFs)</span>
                    <button
                      onClick={() => appendInputRef.current?.click()}
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add PDF
                    </button>
                    <input
                      ref={appendInputRef}
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={handleAppendFiles}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {files.map((f, idx) => (
                      <div
                        key={`${f.name}-${idx}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 text-[10px] dark:bg-indigo-950 dark:text-indigo-300">
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium text-slate-900 dark:text-white">
                            {f.name}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                            ({formatBytes(f.size)})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFile(idx, 'up')}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === files.length - 1}
                            onClick={() => moveFile(idx, 'down')}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-1 rounded text-rose-400 hover:text-rose-600"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Split PDF Controls */}
              {tool.id === 'split-pdf' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Total Document Pages
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Page Range to Extract
                    </label>
                    <input
                      type="text"
                      value={pageRangeStr}
                      onChange={(e) => {
                        setPageRangeStr(e.target.value);
                        setResult(null);
                      }}
                      placeholder="e.g. 1-3, 5, 8"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Use hyphens for continuous page ranges (e.g. 1-4) or commas for separate pages (e.g. 1, 3, 5).
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Extract Specific Pages Selection */}
              {tool.id === 'extract-pdf-pages' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Selected Pages ({selectedPages.length}/{pageCount})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
                          setResult(null);
                        }}
                        className="text-indigo-600 hover:underline text-[11px] font-semibold"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPages([]);
                          setResult(null);
                        }}
                        className="text-slate-400 hover:underline text-[11px]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Click on any page thumbnail in the right panel to toggle inclusion in the extracted document.
                  </p>
                </div>
              )}

              {/* 4. Compress PDF Controls */}
              {tool.id === 'compress-pdf' && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300 space-y-2">
                    <span className="font-bold block">In-Memory PDF Stream Optimizer</span>
                    <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                      Strips redundant metadata tables, removes orphaned fonts, and consolidates PDF cross-reference streams.
                    </p>
                  </div>
                </div>
              )}

              {/* 5. Rotate PDF Controls */}
              {tool.id === 'rotate-pdf' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Rotation Angle
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { deg: 90, label: '90° Right' },
                        { deg: 180, label: '180° Flip' },
                        { deg: 270, label: '90° Left' },
                      ].map((item) => (
                        <button
                          key={item.deg}
                          onClick={() => {
                            setRotateAngle(item.deg);
                            setResult(null);
                          }}
                          className={`p-2.5 rounded-xl border text-center font-medium ${
                            rotateAngle === item.deg
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Apply Rotation To
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'all', label: 'All Pages' },
                        { id: 'odd', label: 'Odd Pages Only' },
                        { id: 'even', label: 'Even Pages Only' },
                      ].map((tgt) => (
                        <button
                          key={tgt.id}
                          onClick={() => {
                            setRotateTarget(tgt.id as any);
                            setResult(null);
                          }}
                          className={`p-2 rounded-xl border text-center font-medium text-xs ${
                            rotateTarget === tgt.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tgt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. PDF Watermark Controls */}
              {tool.id === 'pdf-watermark' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => {
                        setWatermarkText(e.target.value);
                        setResult(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                      {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'COPY', 'DO NOT SHARE'].map((txt) => (
                        <button
                          key={txt}
                          onClick={() => {
                            setWatermarkText(txt);
                            setResult(null);
                          }}
                          className="rounded-lg border border-slate-200/80 px-2 py-1 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                        >
                          {txt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        <span>Opacity</span>
                        <span className="font-mono text-indigo-600">{Math.round(watermarkOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.85"
                        step="0.05"
                        value={watermarkOpacity}
                        onChange={(e) => {
                          setWatermarkOpacity(parseFloat(e.target.value));
                          setResult(null);
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        <span>Font Size</span>
                        <span className="font-mono text-indigo-600">{watermarkSize} pt</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="84"
                        value={watermarkSize}
                        onChange={(e) => {
                          setWatermarkSize(parseInt(e.target.value, 10));
                          setResult(null);
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Angle Rotation
                      </label>
                      <div className="flex gap-1.5 text-xs">
                        {[45, 0, 90].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => {
                              setWatermarkRotation(deg);
                              setResult(null);
                            }}
                            className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                              watermarkRotation === deg
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Color Tone
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={watermarkColor}
                          onChange={(e) => {
                            setWatermarkColor(e.target.value);
                            setResult(null);
                          }}
                          className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                        />
                        <span className="text-xs font-mono text-slate-500">{watermarkColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. JPG to PDF Controls */}
              {tool.id === 'jpg-to-pdf' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <span>Image List ({files.length} Images)</span>
                      <button
                        onClick={() => appendInputRef.current?.click()}
                        className="text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Image
                      </button>
                      <input
                        ref={appendInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAppendFiles}
                        className="hidden"
                      />
                    </div>
                  </div>

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
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
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
                      Orientation
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
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
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

              {/* 8. PDF to JPG Controls */}
              {tool.id === 'pdf-to-jpg' && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300 space-y-2">
                    <span className="font-bold block">Page Rasterizer</span>
                    <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                      Renders every page of this {pageCount}-page PDF into a crisp 150 DPI JPEG image.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Progress Indicator */}
              {isProcessing && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      {progressStatus}
                    </span>
                    <span className="font-mono text-indigo-600">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Process & Reset Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || (tool.id === 'extract-pdf-pages' && selectedPages.length === 0)}
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
                      <span>Execute {tool.name}</span>
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

            {/* Visual Preview & Page Explorer Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between pb-3 text-xs border-b border-slate-200/60 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {result ? 'Completed Document Result' : 'Document Page Explorer'}
                  </span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    {files[0]?.name} ({formatBytes(files.reduce((a, b) => a + b.size, 0))})
                  </span>
                </div>

                {/* Previews Loading state */}
                {isLoadingPreviews && (
                  <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                    <p>Rendering document page thumbnails...</p>
                  </div>
                )}

                {/* Visual Page Thumbnails Grid (Rendered via PDF.js) */}
                {!result && pagePreviews.length > 0 && (
                  <div className="mt-4 max-h-[500px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {pagePreviews.map((page) => {
                        const isSelected = selectedPages.includes(page.pageNumber);
                        return (
                          <div
                            key={page.pageNumber}
                            onClick={() => {
                              if (tool.id === 'extract-pdf-pages') {
                                togglePageSelection(page.pageNumber);
                              }
                            }}
                            className={`group relative rounded-xl border p-2 bg-white dark:bg-slate-800 transition-all ${
                              tool.id === 'extract-pdf-pages' ? 'cursor-pointer hover:border-indigo-400' : ''
                            } ${
                              isSelected && tool.id === 'extract-pdf-pages'
                                ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                              <img
                                src={page.dataUrl}
                                alt={`Page ${page.pageNumber}`}
                                className="h-full w-full object-contain"
                              />

                              {/* Watermark Live preview simulation on page 1 */}
                              {tool.id === 'pdf-watermark' && (
                                <div
                                  className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden"
                                >
                                  <span
                                    className="font-black text-center whitespace-nowrap"
                                    style={{
                                      color: watermarkColor,
                                      opacity: watermarkOpacity,
                                      fontSize: `${Math.round(watermarkSize * 0.4)}px`,
                                      transform: `rotate(${watermarkRotation}deg)`,
                                    }}
                                  >
                                    {watermarkText}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Page {page.pageNumber}
                              </span>
                              {tool.id === 'extract-pdf-pages' && (
                                <span
                                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'border border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  {isSelected && <Check className="h-2.5 w-2.5" />}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* If JPG to PDF, show Image Previews */}
                {!result && isJpgToPdf && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                          <img
                            src={URL.createObjectURL(f)}
                            alt={f.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="mt-1.5 truncate font-medium">{f.name}</div>
                        <div className="text-[10px] text-slate-400">Page {i + 1}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Result Card & Download Section */}
                {result && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs text-left space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-emerald-600" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                              {result.fileName}
                            </span>
                            <span className="text-slate-400 font-mono tabular-nums">
                              {formatBytes(result.originalSize)} →{' '}
                              <strong className="text-emerald-600">{formatBytes(result.fileSize)}</strong>
                            </span>
                          </div>
                        </div>

                        <a
                          href={result.url}
                          download={result.fileName}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download Output
                        </a>
                      </div>

                      {/* If PDF to JPG: Render all page downloads */}
                      {result.pages && result.pages.length > 0 && (
                        <div className="space-y-3 pt-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Extracted Page Images ({result.pages.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {result.pages.map((p) => (
                              <div
                                key={p.pageNumber}
                                className="rounded-xl border border-slate-200 p-2 text-center space-y-2 dark:border-slate-800"
                              >
                                <img
                                  src={p.url}
                                  alt={`Page ${p.pageNumber}`}
                                  className="aspect-[3/4] w-full object-contain rounded-lg bg-slate-50 border border-slate-100"
                                />
                                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                  Page {p.pageNumber}
                                </div>
                                <a
                                  href={p.url}
                                  download={p.fileName}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <Download className="h-3 w-3" /> JPG
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
