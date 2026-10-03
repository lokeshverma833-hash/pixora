import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Zap,
  HardDrive,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PixoraLogo } from '../common/PixoraLogo';

export const DownloadPage: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  const devUrl = 'https://ais-dev-iwvtxbv53ykavzivkwsibc-519262827554.asia-east1.run.app';
  const appUrl =
    typeof window !== 'undefined' && window.location.origin.includes('run.app')
      ? window.location.origin
      : devUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=FFFFFF&color=4F46E5&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Progressive Web App (PWA)</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Download Pixora on your <span className="text-indigo-600 dark:text-indigo-400">Mobile Phone</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Install Pixora directly on Android or iPhone without needing Google Play Store or Apple App Store. Works instantly, runs full-screen, and processes files privately offline.
        </p>
      </div>

      {/* Main Download Card & QR Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Direct Link & 1-Click Install */}
        <div className="lg:col-span-7 rounded-3xl bg-white p-6 sm:p-8 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <PixoraLogo size={52} />
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Pixora Mobile App
                </h3>
                <span className="text-xs text-slate-500 font-mono">v1.2 · Free · Privacy First</span>
              </div>
            </div>

            {/* Direct App Link Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Direct Web App URL
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/80">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none select-all truncate"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 border border-slate-200/80 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 transition-all shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1-Click Install Button */}
            {!isInstalled ? (
              <div className="space-y-2">
                <button
                  onClick={install}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-indigo-600/35 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Download className="h-5 w-5" />
                  <span>Direct Download & Install App</span>
                </button>
                <div className="flex items-center justify-center gap-2">
                  <a
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 py-1 px-2"
                  >
                    <span>Or Launch Web App Immediately</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="font-semibold">
                    Pixora is installed on this device!
                  </span>
                </div>
                <a
                  href="/"
                  className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                >
                  Launch App →
                </a>
              </div>
            )}

            {/* App Features List */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Instant Load</span>
                </div>
                <p className="text-[11px] text-slate-500">Cached locally with Service Worker for quick startup.</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Zero Cloud Uploads</span>
                </div>
                <p className="text-[11px] text-slate-500">Document operations run entirely in local memory.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Progressive Web App Standard</span>
            <span>Compatible with Android & iOS</span>
          </div>
        </div>

        {/* Right Column: Scan with Phone QR Code */}
        <div className="lg:col-span-5 rounded-3xl bg-white p-6 sm:p-8 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-48 w-48 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center">
            <img
              src={qrCodeUrl}
              alt="Scan QR code to install Pixora"
              className="h-full w-full object-contain rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <h4 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-indigo-600" />
              Scan with your Mobile Camera
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Open your phone camera (or Google Lens) and point it at this QR code to launch Pixora directly on your phone.
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Guides (Hindi & English) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Android Guide */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold text-sm">
              🤖
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Android Installation Guide
              </h3>
              <span className="text-xs text-slate-500">Google Chrome / Samsung Internet</span>
            </div>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
            <li>Open the URL above in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.</li>
            <li>Tap the <strong>three dots menu (⋮)</strong> in the top right corner.</li>
            <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
            <li>Tap <strong>&quot;Install&quot;</strong> to confirm. Pixora will be added to your home screen!</li>
          </ol>
        </div>

        {/* iPhone / iPad Guide */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:bg-slate-900 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-bold text-sm">
              🍎
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                iPhone / iPad Installation Guide
              </h3>
              <span className="text-xs text-slate-500">Apple Safari Browser</span>
            </div>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
            <li>Open this link in Apple <strong>Safari</strong> on your iPhone or iPad.</li>
            <li>Tap the <strong>Share button (square with an upward arrow)</strong> in the toolbar.</li>
            <li>Scroll down and select <strong>&quot;Add to Home Screen&quot; (+)</strong>.</li>
            <li>Tap <strong>&quot;Add&quot;</strong> in the top right. Pixora will launch as a full-screen app!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
