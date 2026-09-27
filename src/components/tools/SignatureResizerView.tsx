import React, { useState } from 'react';
import { Download, RefreshCw, Check, Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';
import { cleanSignature, formatBytes } from '../../utils/imageProcessors';
import { ProcessingResult } from '../../types';

export const SignatureResizerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(175);
  const [inkColor, setInkColor] = useState<'black' | 'darkblue'>('black');
  const [presetSize, setPresetSize] = useState<{ w: number; h: number; label: string }>({
    w: 140,
    h: 60,
    label: '140 x 60 px (Govt Portal / SSC / IBPS standard, <20KB)',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const presets = [
    { w: 140, h: 60, label: '140 x 60 px (Standard Portal / <20KB)' },
    { w: 200, h: 100, label: '200 x 100 px (Bank & Legal Portal)' },
    { w: 300, h: 120, label: '300 x 120 px (High-Res Digital Stamp)' },
  ];

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setOriginalUrl(URL.createObjectURL(files[0]));
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const res = await cleanSignature(selectedFile, {
        threshold,
        inkColor,
        targetWidth: presetSize.w,
        targetHeight: presetSize.h,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to clean signature.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title="Upload signature photo or scan"
          subtitle="Photo of a paper signature taken with your mobile camera"
          accept="image/jpeg,image/png,image/webp"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Signature Cleaning & Dimension Controls
            </h3>

            {/* Portal Preset Dimensions */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Target Portal Dimensions
              </label>
              <div className="space-y-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setPresetSize(p);
                      setResult(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      presetSize.w === p.w && presetSize.h === p.h
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Contrast / Threshold Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span>Paper Cleaning Threshold</span>
                <span className="text-indigo-600 dark:text-indigo-400">{threshold}</span>
              </div>
              <input
                type="range"
                min="100"
                max="240"
                value={threshold}
                onChange={(e) => {
                  setThreshold(parseInt(e.target.value, 10));
                  setResult(null);
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Higher values remove yellow paper tone, shadows, and scanner grain.
              </p>
            </div>

            {/* Ink Color Picker */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Enhanced Ink Color
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setInkColor('black');
                    setResult(null);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
                    inkColor === 'black'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-black border border-slate-300" />
                  Crisp Black Ink
                </button>
                <button
                  onClick={() => {
                    setInkColor('darkblue');
                    setResult(null);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
                    inkColor === 'darkblue'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-blue-900 border border-slate-300" />
                  Royal Blue Ink
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Cleaning Signature...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Clean & Resize Signature
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setResult(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900/60 text-center">
              <div className="max-w-md mx-auto rounded-xl p-4 bg-white shadow-sm border border-slate-200">
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  {result ? 'Cleaned & Resized Signature Preview' : 'Original Uploaded Signature'}
                </p>
                <img
                  src={result ? result.url : originalUrl!}
                  alt="Signature"
                  className="max-h-48 w-auto object-contain mx-auto"
                />
              </div>

              {result && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900 text-xs">
                  <div className="text-left">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Portal Ready: {result.width}x{result.height} px
                    </span>
                    <span className="ml-2 text-emerald-600 font-medium">
                      {formatBytes(result.fileSize)} (Under limit)
                    </span>
                  </div>

                  <a
                    href={result.url}
                    download={result.fileName}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Signature
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                <strong>Portal Guarantee:</strong> Automatically resizes to standard 140x60 dimensions and balances JPEG quantization to keep file size well under the typical 20KB portal rejection threshold.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
