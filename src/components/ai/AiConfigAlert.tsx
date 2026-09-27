import React from 'react';
import { KeyRound, ShieldAlert, ExternalLink, RefreshCw } from 'lucide-react';

interface AiConfigAlertProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const AiConfigAlert: React.FC<AiConfigAlertProps> = ({ onRetry, isRetrying }) => {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 shadow-2xs space-y-4">
      <div className="flex items-start gap-3.5">
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-display text-sm sm:text-base font-bold text-amber-900 dark:text-amber-100">
            AI Model Secret Not Configured
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed max-w-xl">
            This AI tool uses secure server-side models for neural processing (photo enhancement, segmentation, and deconvolution). To enable live AI execution without simulated outputs, configure your API secret in your deployment environment.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
          Required Environment Secret:
        </span>
        <code className="block rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 select-all">
          GEMINI_API_KEY=&quot;your_api_key_here&quot;
        </code>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          In Google AI Studio, open <strong>Settings &gt; Secrets</strong> and attach your Gemini API Key. All calls are handled entirely by the server; keys are never exposed in browser client code.
        </p>
      </div>

      {onRetry && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Verify Configuration</span>
          </button>
        </div>
      )}
    </div>
  );
};
