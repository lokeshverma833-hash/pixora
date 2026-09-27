import React, { useState, useRef, DragEvent, ChangeEvent, KeyboardEvent } from 'react';
import { UploadCloud, AlertCircle, ShieldCheck, FileCheck, ArrowUpRight } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  title?: string;
  subtitle?: string;
  className?: string;
  isProcessing?: boolean;
  progress?: number;
  progressLabel?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  accept = 'image/jpeg,image/png,image/webp,image/avif',
  multiple = false,
  maxSizeMB = 50,
  title = 'Drop your files here',
  subtitle = 'or click to browse from your device',
  className = '',
  isProcessing = false,
  progress = 0,
  progressLabel = 'Processing file...',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateFiles = (files: FileList | File[]): File[] => {
    setErrorMessage(null);
    const validList: File[] = [];
    const maxBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxBytes) {
        setErrorMessage(`File "${file.name}" exceeds the maximum limit of ${maxSizeMB}MB.`);
        continue;
      }
      validList.push(file);
      if (!multiple) break;
    }
    return validList;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = validateFiles(e.target.files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    }
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md scale-[1.008]'
            : 'border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Inner Content */}
        <div className="flex flex-col items-center justify-center p-5 sm:p-8 md:p-12 text-center space-y-3 sm:space-y-4">
          {/* Visual Icon Mark */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white border border-indigo-100/80 dark:border-indigo-900/60 shadow-2xs">
            <UploadCloud className="h-6 w-6 stroke-[1.9]" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Action Trigger Button Appearance */}
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs group-hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 transition-colors">
              <span>Choose Files</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>

          {/* Unboxed Metadata Discipline */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Up to {maxSizeMB}MB</span>
            <span aria-hidden="true">·</span>
            <span>JPG, PNG, WebP, PDF</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% Client-Side Privacy
            </span>
          </div>
        </div>

        {/* Processing Overlay State */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs dark:bg-slate-900/95 p-6 animate-in fade-in duration-150">
            <div className="w-full max-w-xs space-y-3 text-center">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-indigo-600 animate-pulse" />
                  {progressLabel}
                </span>
                <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                  {progress > 0 ? `${progress}%` : 'Working...'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress > 0 ? progress : 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Processed locally in browser memory for zero privacy leak
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">File upload error</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
