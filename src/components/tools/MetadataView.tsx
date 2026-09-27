import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Download, Camera, Calendar, MapPin, Sliders, RefreshCw, FileText } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';
import { readImageMetadata, ImageMetadataInfo } from '../../utils/exifReader';
import { removeMetadata, formatBytes } from '../../utils/imageProcessors';
import { ProcessingResult } from '../../types';

export const MetadataView: React.FC<{ mode?: 'view' | 'remove' }> = ({ mode = 'view' }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadataInfo | null>(null);
  const [cleanedResult, setCleanedResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setOriginalUrl(URL.createObjectURL(file));
      setCleanedResult(null);

      const info = await readImageMetadata(file);
      setMetadata(info);

      // If opened directly as "Remove Metadata" tool, automatically process
      if (mode === 'remove') {
        const clean = await removeMetadata(file);
        setCleanedResult(clean);
      }
    }
  };

  const handleClean = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const clean = await removeMetadata(selectedFile);
      setCleanedResult(clean);
    } catch (err) {
      console.error(err);
      alert('Failed to strip metadata.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title={mode === 'remove' ? 'Upload photo to strip EXIF & GPS metadata' : 'Upload photo to inspect EXIF metadata'}
          subtitle="Supports JPG, JPEG, and PNG files directly from cameras or phones"
          accept="image/jpeg,image/png,image/webp"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Metadata Display Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  File & Camera Information
                </h3>
                {metadata?.hasGpsLocation ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <MapPin className="h-3 w-3" /> GPS Coordinates Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> No GPS Location
                  </span>
                )}
              </div>

              {metadata && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">File Name</span>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {metadata.fileName}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Resolution & Megapixels</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metadata.width} × {metadata.height} px ({metadata.megapixels})
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Aspect Ratio</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metadata.aspectRatio}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">File Size</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatBytes(metadata.fileSize)}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Camera Hardware</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metadata.cameraMake} {metadata.cameraModel}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Lens & Exposure</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metadata.focalLength} • {metadata.fNumber} • {metadata.exposureTime} • ISO {metadata.iso}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Date & Timestamp</span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {metadata.dateTimeOriginal}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400 font-medium">Software Engine</span>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {metadata.software}
                    </p>
                  </div>
                </div>
              )}

              {/* Strip metadata action */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={handleClean}
                  disabled={isProcessing}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {isProcessing ? 'Sanitizing...' : 'Wipe All EXIF & GPS Metadata'}
                </button>

                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify(metadata, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '')}_metadata.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Metadata (.json)
                </button>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setMetadata(null);
                    setCleanedResult(null);
                  }}
                  className="rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Photo & Cleaned Result Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900/60 text-center">
              <img
                src={cleanedResult ? cleanedResult.url : originalUrl!}
                alt="Uploaded"
                className="max-h-72 w-auto object-contain mx-auto rounded-xl shadow-xs"
              />

              {cleanedResult && (
                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900 text-left space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Photo 100% Sanitized (Zero EXIF or GPS data remains)</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Saved: {cleanedResult.fileName} • {formatBytes(cleanedResult.fileSize)}
                  </div>
                  <a
                    href={cleanedResult.url}
                    download={cleanedResult.fileName}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Clean Photo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
