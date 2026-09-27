import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Sparkles, Image, FileText, Wrench } from 'lucide-react';
import { TOOLS, CATEGORIES } from '../../data/tools';
import { ToolItem, ToolCategory } from '../../types';
import { IconRenderer } from './IconRenderer';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or listener
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const q = query.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = tool.name.toLowerCase().includes(q);
    const matchesDesc = tool.description.toLowerCase().includes(q);
    const matchesTags = tool.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && (matchesName || matchesDesc || matchesTags);
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 35+ image & PDF tools (e.g., compress, crop, merge, ocr)..."
            className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
          >
            ESC
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 p-2 text-xs dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            All Tools
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as ToolCategory)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Tools Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredTools.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-semibold">No tools found matching &quot;{query}&quot;</p>
              <p className="mt-1 text-xs text-slate-400">Try keywords like &quot;compress&quot;, &quot;pdf&quot;, &quot;crop&quot;, or &quot;passport&quot;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool);
                    onClose();
                  }}
                  className="group flex items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                      <IconRenderer name={tool.icon} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                          {tool.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          · {tool.category}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {tool.shortDesc}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Keyboard Shortcuts Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-mono">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-mono">ESC</kbd> Close
            </span>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            Pixora Search
          </span>
        </div>
      </div>
    </div>
  );
};
