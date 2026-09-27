import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { ToolItem } from '../types';
import { TOOLS } from '../data/tools';
import { Dropzone } from '../components/common/Dropzone';
import { useRecentTools } from '../context/RecentToolsContext';
import { SeoHead } from '../components/common/SeoHead';
import { ToolsSection } from '../components/home/ToolsSection';
import { HeroSearchBar } from '../components/common/HeroSearchBar';

interface HomePageProps {
  onSelectTool: (tool: ToolItem) => void;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectTool,
  onNavigate,
  onOpenSearch,
}) => {
  const { recentTools } = useRecentTools();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Universal Dropzone Handler
  const handleUniversalDrop = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const target = TOOLS.find((t) => t.id === 'compress-pdf') || TOOLS.find((t) => t.category === 'pdf');
      if (target) onSelectTool(target);
    } else {
      const target = TOOLS.find((t) => t.id === 'compress-image') || TOOLS.find((t) => t.category === 'image');
      if (target) onSelectTool(target);
    }
  };

  const faqs = [
    {
      q: 'Are my files really processed directly in my browser?',
      a: 'Yes. All image transformations (compression, resizing, cropping, rounding corners, format conversion) and PDF operations (merging, splitting, rotating, watermarking) execute 100% locally inside your browser memory using HTML5 Canvas and WebAssembly. Your files are never uploaded to any remote server.',
    },
    {
      q: 'Is Pixora Tools completely free with no watermarks?',
      a: 'Yes. Pixora is 100% free with no hidden subscriptions, no sign-up requirements, no daily quotas, and absolutely no forced watermarks stamped onto your downloads.',
    },
    {
      q: 'What formats can I upload and process?',
      a: 'We support standard image formats including JPEG, PNG, WebP, AVIF, and multi-page PDF documents up to 50MB per file.',
    },
    {
      q: 'How does the Passport Photo Maker comply with international standards?',
      a: 'It includes calibrated dimensional presets for US (2x2 inches / 600x600 px), UK/EU (35x45 mm), India (3.5x4.5 cm), and Canada (50x70 mm) at 300 DPI, plus printable 4x6 inch multi-photo sheets ready for pharmacy or retail print counters.',
    },
    {
      q: 'Does Pixora keep logs or retain user documents?',
      a: 'No. Because document processing occurs directly in client memory, our servers have no mechanism to view, index, or store your pictures or documents. We maintain zero data retention.',
    },
  ];

  return (
    <div className="space-y-24 pb-24">
      <SeoHead
        title="Pixora Tools — Everyday Image & PDF Tools | Fast, Free & Private"
        description="All-in-one suite for compressing, converting, and editing images and PDFs. 100% client-side privacy, no watermarks, blazing fast."
        canonicalPath="/"
      />

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 text-center px-4">
        {/* Soft Ambient Radial Blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-80 w-140 rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-4xl space-y-6">
          {/* Quiet Subheading Kicker */}
          <div className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            Client-Side Utility Platform
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08] text-balance">
            Everyday Image & PDF Tools — <br className="hidden sm:inline" />
            <span className="text-indigo-600 dark:text-indigo-400">
              Fast, Free & Private.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            Compress, resize, crop, and convert images, merge or split PDFs, and enhance photos in seconds. Processed directly in your browser memory for total privacy.
          </p>

          {/* Modern Interactive Search Bar with Live Suggestions */}
          <HeroSearchBar onSelectTool={onSelectTool} className="pt-2" />

          {/* Unboxed Trust Points */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Zero Server Uploads</span>
            <span aria-hidden="true">·</span>
            <span>No Watermarks</span>
            <span aria-hidden="true">·</span>
            <span>100% Free Forever</span>
            <span aria-hidden="true">·</span>
            <span>Instant In-Memory Execution</span>
          </div>

          {/* Recently Used Tools Bar (Unboxed clean text) */}
          {recentTools.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Recently Used:</span>
              {recentTools.slice(0, 5).map((tool, idx) => (
                <React.Fragment key={tool.id}>
                  {idx > 0 && <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>}
                  <button
                    onClick={() => onSelectTool(tool)}
                    className="font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
                  >
                    {tool.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Universal Upload Dropzone */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <Dropzone
          onFilesSelected={handleUniversalDrop}
          title="Drop any image or PDF here to start instantly"
          subtitle="Auto-detects format and opens the optimal workstation"
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />
      </section>

      {/* Modern Compact Tools Section */}
      <ToolsSection
        onSelectTool={onSelectTool}
        onNavigate={onNavigate}
      />

      {/* Featured Categories Spotlight */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image Spotlight Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/60 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">01. Image Suite</span>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Comprehensive Image Tools
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Lossless compression, pixel & centimeter precision resizing, circle & square cropping, passport photo creator, signature cleaner, and OCR text extraction.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => onNavigate('/image-tools')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View All 22 Image Tools</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* PDF Spotlight Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/60 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">02. PDF Engine</span>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Client-Side PDF Operations
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Merge documents with drag-and-drop reordering, split page ranges, compress file size, extract single sheets, rotate pages, and stamp custom text watermarks.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => onNavigate('/pdf-tools')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View All 8 PDF Tools</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* AI Utilities Spotlight Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/60 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">03. AI Utilities</span>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Intelligent Photo Enhancement
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                AI photo enhancer, background cutout with edge matting, interactive object removal canvas, 2x/4x super-resolution upscaler, and portrait bokeh blur.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => onNavigate('/ai-tools')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>Explore AI Tools</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Pixora Section (Human Editorial Numbering) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-900 text-white p-8 sm:p-14 shadow-lg">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Why Creators & Teams Trust Pixora
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Built from first principles for instant execution and uncompromising document privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-400">01.</span>
              <h3 className="text-lg font-bold">100% Client-Side Privacy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your private photos, tax documents, and contracts stay on your device. We do not permanently store or analyze your files on remote servers.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-400">02.</span>
              <h3 className="text-lg font-bold">Instant In-Memory Execution</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No uploading gigabytes over slow internet connections and waiting in server queues. Processing finishes instantaneously in browser memory.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-400">03.</span>
              <h3 className="text-lg font-bold">Zero Paywalls & Watermarks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Free means genuinely free. No sign-up walls, no forced watermarks stamped on your downloaded pictures, and no subscription traps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          How Pixora Works
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-10">
          Fast, effortless document and photo editing in three simple steps
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="rounded-2xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block mb-2">Step 01</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
              Select or Drop Files
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Drag your file into any tool dropzone or click to browse from your device.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block mb-2">Step 02</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
              Adjust Your Settings
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tune quality sliders, select dimensions or country passport specs, or mark inpainting areas.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block mb-2">Step 03</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
              Instant Download
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect before/after comparisons and download your optimized result immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Everything you need to know about our privacy and performance
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-2xs"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
