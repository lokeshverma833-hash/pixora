import React from 'react';
import { ShieldCheck, Zap, Heart, Lock, Award, ServerOff } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { SeoHead } from '../components/common/SeoHead';

export const AboutPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <SeoHead
        title="About Pixora Tools — Client-Side First Privacy Architecture"
        description="Learn how Pixora Tools delivers blazing-fast image and PDF utilities that process files directly inside your browser memory."
        canonicalPath="/about"
      />

      <Breadcrumbs items={[{ label: 'About Us' }]} />

      <header className="text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Our Architecture & Manifesto
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Everyday Utilities Built for Human Privacy
        </h1>
        <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
          We built Pixora Tools because we believe everyday digital tools shouldn&apos;t demand your personal data, force intrusive subscriptions, or compromise confidential documents.
        </p>
      </header>

      {/* Philosophy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <ServerOff className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Client-Side Processing
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            By leveraging HTML5 Canvas and WebAssembly compiled engines, documents and images are parsed, cropped, compressed, and merged in your own device RAM.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Zero Server Retention
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We don&apos;t store databases of your personal photos, signatures, or contracts. Once you close your browser tab, memory is cleanly reclaimed by your operating system.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            No Artificial Friction
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            No email registration traps, no countdown delay timers, no monthly download quotas, and no forced watermarks stamped over your graphics.
          </p>
        </div>
      </div>

      {/* Tech Stack Explanation */}
      <section className="rounded-3xl bg-slate-50 p-8 sm:p-10 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Under the Hood
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Pixora Tools is engineered with modern web standards: React, TypeScript, and Tailwind CSS on the presentation layer, paired with high-performance rendering engines like pdf-lib and Tesseract.js. For optional AI features (like image enhancement analysis and vision OCR), server-side proxy routes interface with Gemini models without ever exposing API keys to the frontend client.
        </p>
      </section>
    </div>
  );
};
