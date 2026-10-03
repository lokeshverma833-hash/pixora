import React, { useState } from 'react';
import { ShieldCheck, Heart, Sparkles, ArrowRight, Smartphone, Check } from 'lucide-react';
import { ToolItem } from '../../types';
import { PixoraLogo } from '../common/PixoraLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';

interface FooterProps {
  onNavigate: (path: string) => void;
  onSelectToolBySlug: (slug: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectToolBySlug }) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleInstallClick = async () => {
    if (isInstalled) return;
    const ok = await install();
    if (!ok && !isInstallable) {
      setInstallModalOpen(true);
    }
  };
  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white pt-16 pb-12 dark:border-slate-800 dark:bg-slate-950 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Feature Highlight Box */}
        <div className="mb-14 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/50 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-indigo-600 shadow-2xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  100% Client-Side Privacy Guarantee
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Your files are processed locally in your browser memory whenever possible. Zero permanent cloud retention.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/about')}
              className="shrink-0 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors"
            >
              Our Privacy Architecture
            </button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center text-left focus:outline-none group"
            >
              <PixoraLogo size="sm" showText={true} />
            </button>
            <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Everyday Image & PDF Tools — Fast, Free & Private. A modern, all-in-one suite designed to make document and image editing effortless directly inside your web browser.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              No registration required · No watermarks · No subscriptions
            </p>
            <div className="pt-1">
              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Pixora App Installed</span>
                </span>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400 transition-colors shadow-2xs"
                >
                  <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Install Web App</span>
                </button>
              )}
            </div>
          </div>

          {/* Column: Image Tools */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Image Tools
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectToolBySlug('compress-image')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Compress Image
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('resize-image')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Resize Image
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('crop-image')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Crop Image
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('passport-photo')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Passport Photo Maker
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('image-to-text')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Image to Text OCR
                </button>
              </li>
            </ul>
          </div>

          {/* Column: PDF Tools */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              PDF Tools
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectToolBySlug('merge-pdf')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Merge PDF
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('split-pdf')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Split PDF
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('compress-pdf')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Compress PDF
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('pdf-watermark')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  PDF Watermark
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectToolBySlug('rotate-pdf')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Rotate PDF
                </button>
              </li>
            </ul>
          </div>

          {/* Column: Company & Legal */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Company & Legal
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/download')}
                  className="text-indigo-600 font-semibold hover:underline dark:text-indigo-400 flex items-center gap-1"
                >
                  <span>{isInstalled ? '📱 Mobile App Settings / Info' : '📱 Download Mobile App'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  About Pixora
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/blog')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Guides & Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/privacy')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/terms')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/contact')}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-slate-100 pt-8 sm:flex-row dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Pixora Tools. All rights reserved.</p>
          <div className="mt-4 flex items-center gap-6 sm:mt-0">
            <button onClick={() => onNavigate('/privacy')} className="hover:underline">
              Privacy
            </button>
            <button onClick={() => onNavigate('/terms')} className="hover:underline">
              Terms
            </button>
            <button onClick={() => onNavigate('/cookie-policy')} className="hover:underline">
              Cookies
            </button>
            <button onClick={() => onNavigate('/disclaimer')} className="hover:underline">
              Disclaimer
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </footer>
  );
};
