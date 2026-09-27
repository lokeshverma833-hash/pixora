import React from 'react';
import { Search, Home, ArrowRight, Sparkles } from 'lucide-react';
import { SeoHead } from '../components/common/SeoHead';

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate, onOpenSearch }) => {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-6">
      <SeoHead
        title="Page Not Found (404) — Pixora Tools"
        description="The requested page or tool could not be found."
        canonicalPath="/404"
      />

      <span className="text-6xl font-black text-indigo-600 dark:text-indigo-400">404</span>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Tool or Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          The page or tool you are looking for may have moved or doesn&apos;t exist. Try searching our directory or jump straight back home.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Home className="h-4 w-4" /> Go to Homepage
        </button>

        <button
          onClick={onOpenSearch}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Search className="h-4 w-4" /> Search Tools (⌘K)
        </button>
      </div>
    </div>
  );
};
