import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface InlineAlertProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  message,
  onDismiss,
  className = '',
  variant = 'error',
  actionButton,
}) => {
  if (!message) return null;

  const styleClasses = {
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-200',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/80 dark:bg-indigo-950/40 dark:text-indigo-200',
  }[variant];

  const Icon = variant === 'warning' ? AlertTriangle : variant === 'info' ? Info : AlertCircle;
  const iconColor = {
    error: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-indigo-600 dark:text-indigo-400',
  }[variant];

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-3 text-xs flex items-start justify-between gap-2.5 transition-all ${styleClasses} ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
        <div className="space-y-1.5 min-w-0">
          <p className="leading-relaxed">{message}</p>
          {actionButton && (
            <button
              type="button"
              onClick={actionButton.onClick}
              className="inline-flex items-center text-[11px] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
            >
              {actionButton.label}
            </button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100 p-0.5 rounded-lg transition-opacity cursor-pointer shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
