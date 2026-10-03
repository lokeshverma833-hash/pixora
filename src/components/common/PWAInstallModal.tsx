import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  X,
  Share,
  PlusSquare,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PixoraLogo } from './PixoraLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use the active development live app URL
  const devUrl = 'https://ais-dev-iwvtxbv53ykavzivkwsibc-519262827554.asia-east1.run.app';
  const appUrl =
    typeof window !== 'undefined' && window.location.origin.includes('run.app')
      ? window.location.origin
      : devUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=FFFFFF&color=4F46E5&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header with New Pixora Logo */}
        <div className="flex items-center gap-3.5 mb-5">
          <PixoraLogo size={48} />
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold">
              Download Pixora Mobile App
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Install directly on your phone — Fast, 100% Free & No App Store Needed
            </p>
          </div>
        </div>

        {/* 1-Click Install Button (When browser supports native prompt) */}
        {isInstallable && !isInstalled && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                  Quick Install Detected
                </span>
                <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Tap below to add Pixora icon to your Home Screen
                </span>
              </div>
              <button
                onClick={handleInstallClick}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Install Now
              </button>
            </div>
          </div>
        )}

        {isInstalled && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Pixora is already installed as a standalone app on this device!</span>
          </div>
        )}

        {/* Direct Link Section */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 border border-slate-200/80 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Section (Scan with phone) */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-white p-2 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="Scan QR code to open Pixora on mobile"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                Scan to Open on Mobile
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Scan this QR code using your phone camera (Google Lens or iPhone Camera) to open Pixora directly on your mobile device.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Installation Guides */}
        <div className="space-y-4 text-xs">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <span>How to install on Android (Chrome):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed pl-1 text-[11px]">
              <li>Open the link above in <strong>Google Chrome</strong>.</li>
              <li>Tap the <strong>three dots (⋮)</strong> menu in the top right corner.</li>
              <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
              <li>Pixora will be installed on your mobile home screen!</li>
            </ol>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <span>How to install on iPhone / iPad (Safari):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed pl-1 text-[11px]">
              <li>Open this link in Apple <strong>Safari</strong> on your iOS device.</li>
              <li>Tap the <strong>Share button (square with upward arrow)</strong> at the bottom.</li>
              <li>Scroll down and choose <strong>&quot;Add to Home Screen&quot; (+)</strong>.</li>
              <li>Tap <strong>&quot;Add&quot;</strong> in the top right corner. Pixora will now run as a full-screen app!</li>
            </ol>
          </div>
        </div>

        {/* Features callout */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Fast & Offline</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>100% Private</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Smartphone className="h-4 w-4 text-indigo-500" />
            <span>Full-Screen App</span>
          </div>
        </div>
      </div>
    </div>
  );
};
