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
  Loader2,
} from 'lucide-react';
import { ToolItem, ProcessingResult } from '../../types';
import { Dropzone } from '../common/Dropzone';
import {
  mergePdf,
  splitPdf,
  splitAllPdfPages,
  validatePageRange,
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
import { createZipBlob, downloadBlob } from '../../utils/zipUtils';

interface PdfToolsViewProps {
  tool: ToolItem;
}

export const PdfToolsView: React.FC<PdfToolsViewProps> = ({ tool }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [filePageCounts, setFilePageCounts] = useState<{ [fileName: string]: number }>({});
  const [pageCount, setPageCount] = useState<number>(1);
  const [pagePreviews, setPagePreviews] = useState<RenderedPdfPage[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageRangeStr, setPageRangeStr] = useState<string>('1-2');
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');

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
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipDownloadError, setZipDownloadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const appendInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<ProcessingResult | null>(null);

  const isJpgToPdf = tool.id === 'jpg-to-pdf';
  const isMerge = tool.id === 'merge-pdf';
  const isSplit = tool.id === 'split-pdf';

  // Live validation for Split PDF custom range
  const rangeValidation =
    isSplit && splitMode === 'range' && pageCount > 0
      ? validatePageRange(pageRangeStr, pageCount)
      : { isValid: true, error: null };

  // Helper to safely revoke all URLs in a PDF ProcessingResult
  const revokePdfResultUrls = (r: ProcessingResult | null) => {
    if (!r) return;
    if (r.url && typeof r.url === 'string' && r.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(r.url);
      } catch {
        // Ignore
      }
    }
    if (Array.isArray(r.pages)) {
      for (const page of r.pages) {
        if (page.url && typeof page.url === 'string' && page.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(page.url);
          } catch {
            // Ignore
          }
        }
      }
    }
  };

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      revokePdfResultUrls(resultRef.current);
    };
  }, []);

  // Dedicated preview loader with error handling & retry capability
  const loadPdfPreviews = async (pdfFile: File) => {
    if (isLoadingPreviews) return;
    setIsLoadingPreviews(true);
    setPreviewError(null);
    try {
      const count = await getPdfPageCount(pdfFile);
      setPageCount(count);
      setSelectedPages(Array.from({ length: count }, (_, i) => i + 1));
      setPageRangeStr(`1-${Math.min(count, 3)}`);

      // Render thumbnails for visual preview
      const rendered = await renderPdfToImages(pdfFile, 0.75, 16);
      setPagePreviews(rendered);
    } catch (err: any) {
      console.warn('Could not read PDF previews:', err);
      setPreviewError(
        err?.message || 'Could not render page previews. The document may be complex or password-protected.'
      );
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  // Helper to read page counts for Merge PDF documents asynchronously
  const updateFilePageCounts = async (pdfFiles: File[]) => {
    for (const f of pdfFiles) {
      try {
        const count = await getPdfPageCount(f);
        setFilePageCounts((prev) => ({ ...prev, [f.name]: count }));
      } catch {
        // Fallback silently if encrypted or failed
      }
    }
  };

  // Load files handler with validation
  const handleFiles = async (newFiles: File[]) => {
    setErrorMessage(null);
    setPreviewError(null);
    if (newFiles.length === 0) return;

    if (isJpgToPdf) {
      // Validate image types
      const valid = newFiles.filter((f) => f.type.startsWith('image/'));
      if (valid.length === 0) {
        setErrorMessage('Please upload image files (JPG, PNG, WebP) for JPG to PDF conversion.');
        return;
      }
      revokePdfResultUrls(resultRef.current);
      resultRef.current = null;
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

    revokePdfResultUrls(resultRef.current);
    resultRef.current = null;
    setFiles(valid);
    setResult(null);
    setPagePreviews([]);

    if (isMerge) {
      updateFilePageCounts(valid);
    } else {
      // Load PDF structure and render page previews
      await loadPdfPreviews(valid[0]);
    }
  };

  // Append additional files
  const handleAppendFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      setFiles((prev) => [...prev, ...added]);
      if (isMerge) {
        updateFilePageCounts(added);
      }
      setResult(null);
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
      revokePdfResultUrls(resultRef.current);
      resultRef.current = null;
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
    revokePdfResultUrls(resultRef.current);
    resultRef.current = null;
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
          if (splitMode === 'all') {
            setProgress(35);
            setProgressStatus(`Extracting all ${pageCount} individual pages...`);
            res = await splitAllPdfPages(file);
          } else {
            setProgress(45);
            setProgressStatus(`Extracting pages (${pageRangeStr})...`);
            res = await splitPdf(file, pageRangeStr);
          }
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
        if (resultRef.current && resultRef.current.url !== res?.url) {
          revokePdfResultUrls(resultRef.current);
        }
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

  // Download all extracted PDF pages as a single ZIP archive
  const handleDownloadAllPagesZip = async () => {
    if (!result?.pages || result.pages.length === 0) {
      setZipDownloadError('No page images available to download.');
      return;
    }

    setIsDownloadingZip(true);
    setZipDownloadError(null);

    try {
      const zipInputs = await Promise.all(
        result.pages.map(async (p) => {
          const resp = await fetch(p.url);
          const blob = await resp.blob();
          return {
            name: p.fileName || `page_${p.pageNumber}.jpg`,
            data: blob,
          };
        })
      );

      const zipBlob = await createZipBlob(zipInputs);
      const baseName = files[0]?.name.replace(/\.[^/.]+$/, '') || 'pdf_pages';
      downloadBlob(zipBlob, `${baseName}_all_pages.zip`);
    } catch (err: any) {
      console.error('Failed to create ZIP of PDF pages:', err);
      setZipDownloadError('Failed to package pages into ZIP. You can still download individual pages.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleReset = () => {
    revokePdfResultUrls(resultRef.current);
    resultRef.current = null;
    setFiles([]);
    setPageCount(1);
    setPagePreviews([]);
    setResult(null);
    setErrorMessage(null);
    setPreviewError(null);
    setZipDownloadError(null);
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
            <div className="lg:col-span-5 space-y-6 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
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
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 text-[10px] dark:bg-indigo-950 dark:text-indigo-300">
                            {idx + 1}
                          </span>
                          <div className="truncate min-w-0">
                            <span className="truncate font-semibold text-slate-900 dark:text-white block" title={f.name}>
                              {f.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {filePageCounts[f.name] ? `${filePageCounts[f.name]} ${filePageCounts[f.name] === 1 ? 'page' : 'pages'} · ` : ''}
                              {formatBytes(f.size)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFile(idx, 'up')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-25 transition-colors"
                            title="Move Up in sequence"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === files.length - 1}
                            onClick={() => moveFile(idx, 'down')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-25 transition-colors"
                            title="Move Down in sequence"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove from merge"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {files.length < 2 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>Please add at least 2 PDF documents to combine into a single file.</span>
                    </div>
                  )}
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

                  {/* Dual Split Options: Range Mode vs Split All */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Split Option
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('range');
                          setResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          splitMode === 'range'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        Range Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('all');
                          setResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          splitMode === 'all'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        Split All Pages
                      </button>
                    </div>
                  </div>

                  {splitMode === 'range' ? (
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Page Range to Extract
                        </label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Max: {pageCount}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={pageRangeStr}
                        onChange={(e) => {
                          setPageRangeStr(e.target.value);
                          setResult(null);
                        }}
                        placeholder="e.g. 1-3, 5, 7"
                        className={`w-full rounded-xl border p-2.5 text-xs font-mono text-slate-900 dark:bg-slate-800 dark:text-white focus:outline-none transition-colors ${
                          !rangeValidation.isValid
                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:border-rose-500'
                            : 'border-slate-200 bg-white dark:border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {!rangeValidation.isValid && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in duration-150">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{rangeValidation.error}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[`1-${Math.min(3, pageCount)}`, `1-${Math.min(5, pageCount)}`, `${pageCount}`, `1`].filter((val, i, arr) => arr.indexOf(val) === i).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setPageRangeStr(preset);
                              setResult(null);
                            }}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-mono transition-all ${
                              pageRangeStr === preset
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Extracts specified pages into a clean standalone PDF (<span className="font-mono text-slate-600 dark:text-slate-300">pixora-split.pdf</span>).
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 space-y-1">
                      <span className="font-bold block">Split Every Page</span>
                      <p className="leading-relaxed text-[11px] text-indigo-800/90 dark:text-indigo-300/90">
                        Separates all {pageCount} pages into individual PDF files (<span className="font-mono">page_1.pdf</span>, <span className="font-mono">page_2.pdf</span>...) packaged in a clean ZIP archive.
                      </p>
                    </div>
                  )}
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

              {/* Error Alert with Try Again */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span className="break-words">{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleProcess}
                    disabled={isProcessing || (tool.id === 'extract-pdf-pages' && selectedPages.length === 0)}
                    className="self-start xs:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors text-xs shadow-2xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    Try Again
                  </button>
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
              <div className="pt-2 flex flex-col xs:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={
                    isProcessing ||
                    (tool.id === 'merge-pdf' && files.length < 2) ||
                    (tool.id === 'split-pdf' && splitMode === 'range' && !rangeValidation.isValid) ||
                    (tool.id === 'extract-pdf-pages' && selectedPages.length === 0)
                  }
                  className="flex-1 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                      <span>
                        {tool.id === 'split-pdf'
                          ? 'Splitting PDF...'
                          : tool.id === 'merge-pdf'
                          ? 'Merging PDFs...'
                          : 'Processing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {tool.id === 'split-pdf'
                          ? splitMode === 'all'
                            ? `Split All ${pageCount} Pages`
                            : 'Execute Split PDF'
                          : tool.id === 'merge-pdf'
                          ? `Merge ${files.length} PDFs`
                          : `Execute ${tool.name}`}
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

            {/* Visual Preview & Page Explorer Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between pb-3 text-xs border-b border-slate-200/60 dark:border-slate-800 gap-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    {result ? 'Completed Document Result' : isMerge ? 'Merge Sequence Preview' : 'Document Page Explorer'}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-slate-400 font-mono tabular-nums max-w-[50%] min-w-0">
                    <span
                      className="truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                      title={isMerge ? `${files.length} PDFs` : files[0]?.name}
                    >
                      {isMerge ? `${files.length} PDFs` : files[0]?.name}
                    </span>
                    <span className="shrink-0">
                      ({formatBytes(files.reduce((a, b) => a + b.size, 0))})
                    </span>
                  </div>
                </div>

                {/* Previews Loading state */}
                {isLoadingPreviews && (
                  <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                    <p>Rendering document page thumbnails...</p>
                  </div>
                )}

                {/* Preview Loading Failure with Try Again */}
                {previewError && !isLoadingPreviews && (
                  <div className="my-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-1">
                        <p className="font-semibold text-amber-950 dark:text-amber-200">Unable to load page previews</p>
                        <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed break-words">
                          {previewError}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => files[0] && loadPdfPreviews(files[0])}
                        disabled={isLoadingPreviews}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPreviews ? 'animate-spin' : ''}`} />
                        Try Again
                      </button>
                      <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        Document operations can still be executed.
                      </span>
                    </div>
                  </div>
                )}

                {/* If Merge PDF, show Sequence Overview */}
                {!result && isMerge && (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      The documents will be combined sequentially into a single PDF:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={`merge-seq-${file.name}-${idx}`}
                          className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-start gap-3"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate block" title={file.name}>
                              {file.name}
                            </span>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {filePageCounts[file.name] ? `${filePageCounts[file.name]} ${filePageCounts[file.name] === 1 ? 'page' : 'pages'} · ` : ''}
                              {formatBytes(file.size)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Page Thumbnails Grid (Rendered via PDF.js) */}
                {!result && !isMerge && pagePreviews.length > 0 && (
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[65%]">
                          <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-bold text-slate-900 dark:text-white block text-sm truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                              title={result.fileName}
                            >
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
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors min-h-[42px]"
                        >
                          <Download className="h-4 w-4" />
                          {tool.id === 'split-pdf'
                            ? splitMode === 'all'
                              ? 'Download Split Pages (ZIP)'
                              : 'Download Split PDF'
                            : tool.id === 'merge-pdf'
                            ? 'Download Merged PDF'
                            : 'Download Output'}
                        </a>
                      </div>

                      {/* If PDF to JPG: Render all page downloads */}
                      {result.pages && result.pages.length > 0 && (
                        <div className="space-y-3 pt-1">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Extracted Page Images ({result.pages.length})
                            </span>

                            {/* Download All Pages button */}
                            <button
                              type="button"
                              onClick={handleDownloadAllPagesZip}
                              disabled={isDownloadingZip}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                              {isDownloadingZip ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Packaging All Pages...
                                </>
                              ) : (
                                <>
                                  <FileArchive className="h-3.5 w-3.5" /> Download All Pages ({result.pages.length} ZIP)
                                </>
                              )}
                            </button>
                          </div>

                          {/* Non-blocking Zip error with Try Again */}
                          {zipDownloadError && (
                            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 sm:p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                              <div className="flex items-start sm:items-center gap-2 min-w-0">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5 sm:mt-0" />
                                <span className="break-words">{zipDownloadError}</span>
                              </div>
                              <div className="flex items-center gap-2 self-start xs:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={handleDownloadAllPagesZip}
                                  disabled={isDownloadingZip}
                                  className="font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 text-xs"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isDownloadingZip ? 'animate-spin' : ''}`} />
                                  Try Again
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setZipDownloadError(null)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 font-bold text-xs"
                                  title="Dismiss"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}

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
