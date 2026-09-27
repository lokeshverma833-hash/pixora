import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, Filter } from 'lucide-react';
import { ToolCategory, ToolItem } from '../types';
import { TOOLS, CATEGORIES } from '../data/tools';
import { IconRenderer } from '../components/common/IconRenderer';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { SeoHead } from '../components/common/SeoHead';

interface CategoryPageProps {
  category: ToolCategory;
  onSelectTool: (tool: ToolItem) => void;
  onNavigate: (path: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  onSelectTool,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const catMeta = CATEGORIES.find((c) => c.id === category) || {
    name: 'Tools',
    desc: 'Browser utility tools',
    icon: 'Wrench',
  };

  const tools = TOOLS.filter((t) => {
    if (category === 'utilities') {
      return (
        t.category === 'utilities' ||
        t.id === 'image-metadata' ||
        t.id === 'remove-metadata' ||
        t.id === 'color-picker' ||
        t.id === 'signature-resizer'
      );
    }
    return t.category === category;
  });

  const filteredTools = tools.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SeoHead
        title={`${catMeta.name} — Free Online Suite | Pixora Tools`}
        description={catMeta.desc}
        canonicalPath={`/${category}-tools`}
      />

      <Breadcrumbs items={[{ label: catMeta.name }]} />

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/80 pb-8 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
            Category Overview
          </span>
          <h1 className="font-display mt-1 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white">
            {catMeta.name}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {catMeta.desc}. All tools run locally in your web browser for speed and maximum privacy.
          </p>
        </div>

        {/* Filter / Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${catMeta.name}...`}
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No tools found matching &quot;{searchQuery}&quot;
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your search terms or view all tools.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-slate-50 dark:border-slate-700 dark:text-indigo-400"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Tools Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-2xs hover:border-indigo-400/90 hover:shadow-xs hover:-translate-y-0.5 dark:border-slate-800/80 dark:bg-slate-900 transition-all duration-150"
            >
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800/80 dark:text-slate-300 transition-colors mb-4 border border-slate-200/60 dark:border-slate-700/60">
                  <IconRenderer name={tool.icon} className="h-5 w-5" />
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {tool.shortDesc}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Open Tool</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
