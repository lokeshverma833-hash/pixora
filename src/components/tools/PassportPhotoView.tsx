import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, CheckCircle, Sliders, Printer, Shield } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';
import { InlineAlert } from '../common/InlineAlert';
import { generatePassportPhoto, formatBytes } from '../../utils/imageProcessors';
import { ProcessingResult } from '../../types';

const PRESETS = [
  { id: 'us', name: 'United States (2 x 2 in)', wMm: 50.8, hMm: 50.8, note: 'State Dept / Visa standard' },
  { id: 'uk_eu', name: 'UK & Schengen EU (35 x 45 mm)', wMm: 35, hMm: 45, note: 'Standard European biometric' },
  { id: 'india', name: 'India (3.5 x 4.5 cm)', wMm: 35, hMm: 45, note: 'Passport & Govt portals' },
  { id: 'india_oci', name: 'India OCI (2 x 2 in / 51x51 mm)', wMm: 50.8, hMm: 50.8, note: 'OCI card & Visa' },
  { id: 'canada', name: 'Canada (50 x 70 mm)', wMm: 50, hMm: 70, note: 'Passport Canada spec' },
  { id: 'australia', name: 'Australia (35 x 45 mm)', wMm: 35, hMm: 45, note: 'Passports & immigration' },
];

export const PassportPhotoView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [sheetType, setSheetType] = useState<'single' | 'sheet4x6' | 'sheetA4'>('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const originalUrlRef = useRef<string | null>(null);
  const resultRef = useRef<ProcessingResult | null>(null);

  useEffect(() => {
    originalUrlRef.current = originalUrl;
  }, [originalUrl]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (originalUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(originalUrlRef.current);
      }
      if (resultRef.current?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(resultRef.current.url);
      }
    };
  }, []);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      if (originalUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(originalUrlRef.current);
      }
      if (resultRef.current?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(resultRef.current.url);
      }
      const url = URL.createObjectURL(files[0]);
      setSelectedFile(files[0]);
      setOriginalUrl(url);
      setResult(null);
      setErrorMessage(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await generatePassportPhoto(selectedFile, {
        widthMm: selectedPreset.wMm,
        heightMm: selectedPreset.hMm,
        dpi: 300,
        bgColor,
        sheetType,
      });
      if (resultRef.current?.url?.startsWith('blob:') && resultRef.current.url !== res.url) {
        URL.revokeObjectURL(resultRef.current.url);
      }
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to generate passport photo. Please try a different image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (originalUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    if (resultRef.current?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(resultRef.current.url);
      resultRef.current = null;
    }
    setSelectedFile(null);
    setOriginalUrl(null);
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title="Upload your front-facing portrait"
          subtitle="Clear portrait with neutral facial expression works best"
          accept="image/jpeg,image/png,image/webp"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Passport & Visa Specifications
            </h3>

            {/* Country Preset Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Destination Country / Preset
              </label>
              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset);
                      setResult(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      selectedPreset.id === preset.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 font-semibold text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{preset.name}</span>
                      {selectedPreset.id === preset.id && (
                        <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal block mt-0.5">
                      {preset.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Background Tone
              </label>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Pure White', color: '#FFFFFF' },
                  { label: 'Off White', color: '#F8FAFC' },
                  { label: 'Light Blue', color: '#E0F2FE' },
                  { label: 'Light Gray', color: '#F1F5F9' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    onClick={() => {
                      setBgColor(bg.color);
                      setResult(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                      bgColor === bg.color
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 font-medium'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: bg.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300">{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Layout (Single or Printable Sheet) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'single', label: 'Single Photo', desc: '1 Cut Photo' },
                  { id: 'sheet4x6', label: '4x6 Inch Sheet', desc: '6-8 Photos Grid' },
                  { id: 'sheetA4', label: 'A4 Print Sheet', desc: 'Document Size' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSheetType(opt.id as any);
                      setResult(null);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      sheetType === opt.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <InlineAlert
                message={errorMessage}
                onDismiss={() => setErrorMessage(null)}
              />
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-slate-900 dark:bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Calibrating...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>Generate {sheetType === 'single' ? 'Photo' : 'Print Sheet'}</span>
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

          {/* Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 text-center">
              <div className="relative inline-block max-w-full overflow-hidden rounded-xl shadow-2xs bg-white border border-slate-200/60 dark:border-slate-800">
                <img
                  src={result ? result.url : originalUrl!}
                  alt="Passport preview"
                  className="max-h-[500px] w-auto object-contain mx-auto"
                />

                {/* Biometric overlay guide when previewing original single photo */}
                {!result && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
                    <div className="border-t-2 border-dashed border-emerald-400 text-left">
                      <span className="bg-emerald-600/90 text-[10px] font-mono text-white px-1.5 py-0.5 rounded">
                        Top of head
                      </span>
                    </div>
                    <div className="border-b-2 border-dashed border-emerald-400 text-left">
                      <span className="bg-emerald-600/90 text-[10px] font-mono text-white px-1.5 py-0.5 rounded">
                        Chin line
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status info */}
              {result && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs">
                  <div className="text-left space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-xs">
                      {result.fileName}
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {result.width}x{result.height} px · {formatBytes(result.fileSize)}
                    </span>
                  </div>

                  <a
                    href={result.url}
                    download={result.fileName}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Ready-to-Print
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
              <Shield className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Passport Photo Tip:</strong> Avoid smiling with teeth, remove glasses or hats, look directly into the camera with both ears visible, and ensure lighting is evenly distributed.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
