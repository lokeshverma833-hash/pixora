import React, { useState } from 'react';
import { FileSearch, Copy, Download, Sparkles, Check, RefreshCw, Languages, FileText } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { Dropzone } from '../common/Dropzone';

export const OcrToolView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [language, setLanguage] = useState<'eng' | 'spa' | 'fra' | 'deu'>('eng');
  const [useAiVision, setUseAiVision] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setPreviewUrl(URL.createObjectURL(files[0]));
      setExtractedText('');
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      if (useAiVision) {
        // AI Gemini Vision OCR via server
        setProgressStatus('Sending to Gemini AI Vision model...');
        setProgress(30);

        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const resp = await fetch('/api/ai/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64,
                mimeType: selectedFile.type || 'image/jpeg',
              }),
            });
            const data = await resp.json();
            if (data.text) {
              setExtractedText(data.text);
            } else {
              throw new Error(data.error || 'AI OCR could not find text.');
            }
          } catch (err: any) {
            console.warn('AI OCR fallback to Tesseract:', err);
            // Fallback to client-side OCR
            await runTesseract();
          } finally {
            setIsProcessing(false);
            setProgress(100);
          }
        };
      } else {
        await runTesseract();
      }
    } catch (err) {
      console.error(err);
      alert('OCR extraction failed. Please try a clearer image.');
      setIsProcessing(false);
    }
  };

  const runTesseract = async () => {
    if (!selectedFile) return;
    setProgressStatus('Initializing OCR engine...');
    setProgress(15);

    const worker = await createWorker(language);
    setProgressStatus('Recognizing text characters...');
    setProgress(50);

    const ret = await worker.recognize(selectedFile);
    setExtractedText(ret.data.text);
    await worker.terminate();
    setIsProcessing(false);
    setProgress(100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '')}_ocr.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
  const charCount = extractedText.length;

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title="Upload image, document scan, or screenshot"
          subtitle="Extract printed, typed, or handwritten text into editable text"
          accept="image/jpeg,image/png,image/webp,image/avif"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls & Image Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
              <div className="max-h-64 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <img
                  src={previewUrl!}
                  alt="Original to extract"
                  className="max-h-64 w-auto object-contain mx-auto"
                />
              </div>

              {/* Mode switch */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Recognition Engine
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setUseAiVision(false)}
                    className={`p-2.5 rounded-xl border text-center font-medium ${
                      !useAiVision
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Client-Side OCR (Private)
                  </button>
                  <button
                    onClick={() => setUseAiVision(true)}
                    className={`p-2.5 rounded-xl border text-center font-medium flex items-center justify-center gap-1.5 ${
                      useAiVision
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    AI Vision OCR
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              {!useAiVision && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5" /> Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="eng">English</option>
                    <option value="spa">Spanish (Español)</option>
                    <option value="fra">French (Français)</option>
                    <option value="deu">German (Deutsch)</option>
                  </select>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Scanning ({progress}%)
                    </>
                  ) : (
                    <>
                      <FileSearch className="h-4 w-4" />
                      Extract Text
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedText('');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>

              {isProcessing && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                  {progressStatus}
                </p>
              )}
            </div>
          </div>

          {/* Extracted Text Result Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Extracted Editable Text
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  {wordCount} words • {charCount} characters
                </div>
              </div>

              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="Extracted text will appear here. You can click 'Extract Text' to begin..."
                className="w-full h-80 rounded-xl border border-slate-200 bg-slate-50/60 p-4 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:bg-slate-900"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleCopy}
                  disabled={!extractedText}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Text
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadTxt}
                  disabled={!extractedText}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download as .TXT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
