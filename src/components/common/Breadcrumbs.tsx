import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  items: {
    label: string;
    href?: string;
    onClick?: () => void;
  }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <li className="inline-flex items-center">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }}
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </a>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <li>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </li>
              <li>
                {isLast || !item.href && !item.onClick ? (
                  <span className="font-semibold text-slate-900 dark:text-white" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {item.label}
                  </button>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
