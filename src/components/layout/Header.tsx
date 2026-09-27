import React, { useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Download,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useRecentTools } from '../../context/RecentToolsContext';
import { ToolItem } from '../../types';
import { PWAInstallModal } from '../common/PWAInstallModal';
import { PixoraLogo } from '../common/PixoraLogo';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
  onSelectTool: (tool: ToolItem) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onOpenSearch,
  onSelectTool,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { recentTools } = useRecentTools();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Image Tools', path: '/image-tools' },
    { label: 'PDF Tools', path: '/pdf-tools' },
    { label: 'AI Tools', path: '/ai-tools' },
    { label: 'Utilities', path: '/utilities' },
    { label: 'Guides', path: '/blog' },
    { label: 'About', path: '/about' },
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Identity */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => handleLinkClick('/')}
            className="flex items-center group focus-visible:outline-none"
          >
            <PixoraLogo size="sm" showText={true} />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/' ? currentPath === '/' : currentPath.startsWith(link.path);

              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`relative py-1 text-xs font-semibold tracking-wide transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800 transition-all shadow-2xs group"
            title="Search tools (⌘K)"
          >
            <Search className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Search tools...</span>
            <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Download Mobile App Button */}
          <button
            onClick={() => setInstallModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 lg:hidden hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur-xl p-5 lg:hidden dark:border-slate-800 dark:bg-slate-950/95 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <nav className="flex flex-col space-y-1.5">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/' ? currentPath === '/' : currentPath.startsWith(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                </button>
              );
            })}
          </nav>

          {/* Mobile Theme Toggle Row */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-600" />
                )}
                <span>Appearance: {theme === 'dark' ? 'Night (Dark)' : 'Day (Light)'}</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Switch to {theme === 'dark' ? 'Day' : 'Night'}
              </span>
            </button>
          </div>

          {/* Mobile App Download Button */}
          <div className="mt-3">
            <button
              onClick={() => {
                setInstallModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>Download Pixora Mobile App</span>
              </div>
              <Download className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Recently Used in Mobile Drawer */}
          {recentTools.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
                Recently Used
              </span>
              <div className="flex flex-wrap gap-2">
                {recentTools.slice(0, 4).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(tool);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 min-h-[36px]"
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PWA Install & Download Modal */}
      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </header>
  );
};
