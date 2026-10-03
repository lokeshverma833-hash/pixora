import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ToolItem } from '../../types';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { SeoHead } from '../common/SeoHead';
import { IconRenderer } from '../common/IconRenderer';
import { useRecentTools } from '../../context/RecentToolsContext';
import { TOOLS } from '../../data/tools';

// Tool Views
import { ImageToolsView } from './ImageToolsView';
import { PdfToolsView } from './PdfToolsView';
import { AiToolsView } from './AiToolsView';
import { PassportPhotoView } from './PassportPhotoView';
import { SignatureResizerView } from './SignatureResizerView';
import { MetadataView } from './MetadataView';
import { ColorPickerView } from './ColorPickerView';
import { OcrToolView } from './OcrToolView';

interface ToolRunnerProps {
  tool: ToolItem;
  onSelectTool: (tool: ToolItem) => void;
  onNavigate: (path: string) => void;
}

export const ToolRunner: React.FC<ToolRunnerProps> = ({ tool, onSelectTool, onNavigate }) => {
  const { addRecentTool } = useRecentTools();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    addRecentTool(tool.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tool.id]);

  const relatedTools = TOOLS.filter(
    (t) => t.category === tool.category && t.id !== tool.id
  ).slice(0, 4);

  // Render appropriate interactive component
  const renderToolComponent = () => {
    switch (tool.id) {
      case 'passport-photo':
        return <PassportPhotoView />;
      case 'signature-resizer':
        return <SignatureResizerView />;
      case 'image-metadata':
        return <MetadataView mode="view" />;
      case 'remove-metadata':
        return <MetadataView mode="remove" />;
      case 'color-picker':
        return <ColorPickerView />;
      case 'image-to-text':
        return <OcrToolView />;
      default:
        if (tool.category === 'pdf') {
          return <PdfToolsView tool={tool} />;
        }
        if (tool.category === 'ai') {
          return <AiToolsView tool={tool} />;
        }
        return <ImageToolsView tool={tool} />;
    }
  };

  const getCategoryLabel = () => {
    switch (tool.category) {
      case 'image':
        return 'Image Tools';
      case 'pdf':
        return 'PDF Tools';
      case 'ai':
        return 'AI Utilities';
      default:
        return 'Utilities';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SeoHead
        title={tool.metaTitle}
        description={tool.metaDescription}
        canonicalPath={`/tools/${tool.slug}`}
        toolName={tool.name}
        faq={tool.faq}
      />

      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        items={[
          {
            label: getCategoryLabel(),
            onClick: () => onNavigate(`/${tool.category}-tools`),
          },
          { label: tool.name },
        ]}
      />

      {/* Tool Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs shrink-0">
              <IconRenderer name={tool.icon} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {tool.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>100% Client-Side</span>
                <span aria-hidden="true">·</span>
                <span>Zero Server Upload</span>
                <span aria-hidden="true">·</span>
                <span>High-Fidelity Engine</span>
              </div>
            </div>
          </div>

          <p className="max-w-md text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left md:text-right">
            {tool.description}
          </p>
        </div>
      </div>

      {/* Main Interactive Tool Body */}
      <div className="mb-16">{renderToolComponent()}</div>

      {/* How It Works Section */}
      <section className="mb-16 rounded-3xl bg-white p-6 sm:p-10 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6">
          How to Use {tool.name} in 3 Simple Steps
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tool.howToSteps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl bg-slate-50/80 p-6 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300/80 dark:hover:border-indigo-700/60 transition-colors"
            >
              <span className="inline-block text-sm font-mono font-extrabold tracking-wider bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-indigo-300 dark:to-violet-400 mb-2.5">
                0{s.step}.
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">
                {s.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features & FAQs Grid */}
      <section className="mb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Key Capabilities */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            Key Capabilities
          </h2>
          <ul className="space-y-3.5">
            {tool.features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* FAQs */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {tool.faq.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden dark:border-slate-800"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Related Tools Recommendation */}
      {relatedTools.length > 0 && (
        <section className="mt-12">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-6">
            More Popular Tools You Might Like
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedTools.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTool(t)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-2xs hover:border-indigo-400/90 hover:shadow-md hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 transition-all duration-200 ease-out"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 transition-colors mb-3 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                    <IconRenderer name={t.icon} className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
                    {t.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t.shortDesc}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Open Tool</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
