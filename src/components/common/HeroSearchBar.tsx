import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Sparkles, ArrowRight, CornerDownLeft, Sliders, Check } from 'lucide-react';
import { TOOLS } from '../../data/tools';
import { ToolItem } from '../../types';
import { IconRenderer } from './IconRenderer';

interface HeroSearchBarProps {
  onSelectTool: (tool: ToolItem) => void;
  className?: string;
}

export const HeroSearchBar: React.FC<HeroSearchBarProps> = ({ onSelectTool, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popular quick tags for 1-click discovery
  const quickTags = [
    { label: 'Compress Image', slug: 'compress-image' },
    { label: 'Passport Photo', slug: 'passport-photo' },
    { label: 'Merge PDF', slug: 'merge-pdf' },
    { label: 'AI Enhancer', slug: 'ai-photo-enhancer' },
    { label: 'JPG to PNG', slug: 'jpg-to-png' },
    { label: 'Crop Photo', slug: 'crop-image' },
  ];

  // Filter tools based on query
  const filteredTools = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // When empty and focused, show top recommended tools
      return TOOLS.slice(0, 6);
    }
    return TOOLS.filter((tool) => {
      const matchName = tool.name.toLowerCase().includes(q);
      const matchDesc = tool.description.toLowerCase().includes(q);
      const matchTags = tool.tags.some((t) => t.toLowerCase().includes(q));
      const matchCategory = tool.category.toLowerCase().includes(q);
      return matchName || matchDesc || matchTags || matchCategory;
    }).slice(0, 8);
  }, [query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTools.length]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools[selectedIndex]) {
        handleSelect(filteredTools[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (tool: ToolItem) => {
    onSelectTool(tool);
    setIsOpen(false);
    setQuery('');
  };

  const handleQuickTagClick = (slug: string) => {
    const found = TOOLS.find((t) => t.slug === slug || t.id === slug);
    if (found) {
      handleSelect(found);
    } else {
      setQuery(slug.replace(/-/g, ' '));
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* Search Input Container with Glowing Gradient Backdrop */}
      <div className="relative group">
        {/* Ambient Gradient Glow */}
        <div className="absolute -inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-20 blur-md group-hover:opacity-35 group-focus-within:opacity-60 transition duration-300 pointer-events-none" />

        {/* Input Wrapper */}
        <div className="relative flex items-center w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-indigo-500/5 group-focus-within:border-indigo-500 dark:group-focus-within:border-indigo-400 group-focus-within:shadow-xl group-focus-within:shadow-indigo-500/10 transition-all p-1.5 sm:p-2">
          {/* Search Icon with Glowing Container */}
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0 ml-1">
            <Search className="h-5 w-5 transition-transform duration-200 group-focus-within:scale-110" />
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search 35+ tools (e.g. compress, crop, merge pdf, passport photo)..."
            className="w-full bg-transparent px-3 py-2 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />

          {/* Clear Button if input has query */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Keyboard shortcut badge */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 mr-2 select-none">
            <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Quick Search Tag Pills (Below Search Bar) */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-1">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 select-none">
          Popular:
        </span>
        {quickTags.map((tag) => (
          <button
            key={tag.slug}
            type="button"
            onClick={() => handleQuickTagClick(tag.slug)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-indigo-600/50 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 shadow-2xs transition-all active:scale-95"
          >
            <span>{tag.label}</span>
          </button>
        ))}
      </div>

      {/* Live Search Auto-Complete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header of results list */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-slate-900/60">
            <span>{query ? `Results for "${query}"` : 'Recommended Tools'}</span>
            <span className="font-mono text-[10px] normal-case">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} found
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-1">
            {filteredTools.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No tools found for "{query}"
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try searching for "compress", "crop", "pdf", or "resize"
                </p>
              </div>
            ) : (
              filteredTools.map((tool, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelect(tool)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <IconRenderer name={tool.icon} className="h-4.5 w-4.5" />
                      </div>

                      {/* Tool Name & 1-line description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm truncate">
                            {tool.name}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              tool.category === 'ai'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : tool.category === 'pdf'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Arrow */}
                    <div className="shrink-0 flex items-center gap-1.5 ml-2">
                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                          Open <CornerDownLeft className="h-3 w-3" />
                        </span>
                      )}
                      <ArrowRight
                        className={`h-4 w-4 transition-transform ${
                          isSelected
                            ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1 py-0.5 text-[9px] font-mono">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1 py-0.5 text-[9px] font-mono">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 dark:border-slate-700 px-1 py-0.5 text-[9px] font-mono">ESC</kbd> Close
              </span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              35+ Fast Tools
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
