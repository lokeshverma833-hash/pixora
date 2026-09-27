import React from 'react';
import {
  Flame,
  Image as ImageIcon,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ToolItem } from '../../types';
import { TOOLS } from '../../data/tools';
import { IconRenderer } from '../common/IconRenderer';

interface ToolsSectionProps {
  onSelectTool: (tool: ToolItem) => void;
  onNavigate: (path: string) => void;
}

interface CompactToolCardProps {
  tool: ToolItem;
  customDesc?: string;
  onClick: () => void;
}

const CompactToolCard: React.FC<CompactToolCardProps> = ({
  tool,
  customDesc,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-between text-center rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-indigo-400 hover:shadow-md hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-900/90 dark:hover:border-indigo-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[120px] sm:min-h-[128px] w-full cursor-pointer"
      title={`${tool.name} — ${tool.shortDesc}`}
    >
      {/* Icon inside small rounded container */}
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-50 text-indigo-600 border border-slate-100 shadow-2xs group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800/90 dark:text-indigo-400 dark:border-slate-700/60 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-300 transition-all duration-200 shrink-0">
        <IconRenderer name={tool.icon} className="h-5 w-5" />
      </div>

      {/* Tool Name */}
      <span className="mt-2 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2 px-0.5">
        {tool.name}
      </span>

      {/* Optional Short 1-line description */}
      <span className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 w-full px-0.5">
        {customDesc || tool.shortDesc}
      </span>
    </button>
  );
};

export const ToolsSection: React.FC<ToolsSectionProps> = ({
  onSelectTool,
  onNavigate,
}) => {
  // Helper to safely find tool by ID or slug
  const findTool = (id: string): ToolItem | undefined => {
    return TOOLS.find((t) => t.id === id || t.slug === id);
  };

  // 1. POPULAR TOOLS
  const popularToolConfigs = [
    { id: 'compress-image', desc: 'Reduce image file size' },
    { id: 'resize-image', desc: 'Scale dimensions or %' },
    { id: 'crop-image', desc: 'Trim edges & framing' },
    { id: 'jpg-to-png', desc: 'Convert JPG to PNG' },
    { id: 'png-to-jpg', desc: 'Convert PNG to JPG' },
    { id: 'image-to-text', desc: 'Extract text with OCR' },
  ];

  // 2. IMAGE TOOLS
  const imageToolConfigs = [
    { id: 'compress-image', desc: 'Lossless compression' },
    { id: 'resize-image', desc: 'Scale by dimensions' },
    { id: 'resize-image-kb', desc: 'Target exact KB limit' },
    { id: 'resize-image-pixels', desc: 'Exact pixel dimensions' },
    { id: 'resize-image-cm', desc: 'Print cm and DPI' },
    { id: 'crop-image', desc: 'Interactive cropper' },
    { id: 'circle-crop', desc: 'Circular avatar PNG' },
    { id: 'square-crop', desc: '1:1 square photo crop' },
    { id: 'rotate-image', desc: 'Rotate 90° or angle' },
    { id: 'flip-image', desc: 'Mirror horizontally/vertically' },
    { id: 'round-corners', desc: 'Smooth curved borders' },
    { id: 'passport-photo', desc: '2x2 & 35x45mm sheets' },
    { id: 'signature-resizer', desc: 'Clean signature for forms' },
    { id: 'color-picker', desc: 'HEX & RGB eyedropper' },
    { id: 'remove-metadata', desc: 'Strip EXIF & GPS tags' },
  ];

  // 3. PDF TOOLS
  const pdfToolConfigs = [
    { id: 'merge-pdf', desc: 'Combine multiple PDFs' },
    { id: 'split-pdf', desc: 'Extract custom page ranges' },
    { id: 'compress-pdf', desc: 'Reduce PDF file size' },
    { id: 'jpg-to-pdf', desc: 'Convert photos to PDF' },
    { id: 'pdf-to-jpg', desc: 'Export pages as images' },
    { id: 'extract-pdf-pages', desc: 'Select individual pages' },
    { id: 'rotate-pdf', desc: 'Permanently rotate pages' },
    { id: 'pdf-watermark', desc: 'Stamp text watermark' },
  ];

  // 4. AI TOOLS
  const aiToolConfigs = [
    { id: 'ai-enhancer', desc: 'Dynamic HDR & clarity' },
    { id: 'background-remover', desc: 'Instant transparent cutout' },
    { id: 'object-remover', desc: 'Erase unwanted items' },
    { id: 'image-upscaler', desc: '2x & 4x super resolution' },
    { id: 'background-blur', desc: 'DSLR portrait bokeh' },
    { id: 'image-unblur', desc: 'Sharpen blurry details' },
  ];

  const renderSection = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    configs: { id: string; desc: string }[],
    viewAllPath: string,
    viewAllLabel: string
  ) => {
    const validTools = configs
      .map((c) => ({ tool: findTool(c.id), desc: c.desc }))
      .filter((item): item is { tool: ToolItem; desc: string } => !!item.tool);

    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                {icon}
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                {title}
              </h2>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                ({validTools.length})
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 pl-9">
              {subtitle}
            </p>
          </div>

          <button
            onClick={() => onNavigate(viewAllPath)}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            <span>View all {title.toLowerCase()}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Compact Grid: 6 on Desktop, 4 on Tablet, 2 on Mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {validTools.map(({ tool, desc }) => (
            <CompactToolCard
              key={`${title}-${tool.id}`}
              tool={tool}
              customDesc={desc}
              onClick={() => onSelectTool(tool)}
            />
          ))}
        </div>

        {/* View all tools link below category */}
        <div className="pt-2 pb-6 text-center">
          <button
            onClick={() => onNavigate(viewAllPath)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors py-1.5 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80 shadow-2xs"
          >
            <span>View all {viewAllLabel}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
      {/* 1. POPULAR TOOLS */}
      {renderSection(
        'Popular Tools',
        'Quick access to our most frequently used everyday utilities',
        <Flame className="h-4 w-4" />,
        popularToolConfigs,
        '/image-tools',
        'popular tools →'
      )}

      {/* 2. IMAGE TOOLS */}
      {renderSection(
        'Image Tools',
        'Precision cropping, compression, physical scaling, and format conversion',
        <ImageIcon className="h-4 w-4" />,
        imageToolConfigs,
        '/image-tools',
        '22 image tools →'
      )}

      {/* 3. PDF TOOLS */}
      {renderSection(
        'PDF Tools',
        'Client-side document merging, splitting, compression, and watermarks',
        <FileText className="h-4 w-4" />,
        pdfToolConfigs,
        '/pdf-tools',
        '8 PDF tools →'
      )}

      {/* 4. AI TOOLS */}
      {renderSection(
        'AI Tools',
        'Smart image upscaling, background removal, inpainting, and enhancement',
        <Sparkles className="h-4 w-4" />,
        aiToolConfigs,
        '/ai-tools',
        'AI tools →'
      )}
    </section>
  );
};
