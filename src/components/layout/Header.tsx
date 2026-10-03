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
  ChevronRight,
  Check,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useRecentTools } from '../../context/RecentToolsContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
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
  const { isInstalled, isInstallable, install, toastMessage, setToastMessage } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleInstallAction = async () => {
    if (isInstalled) return;
    const accepted = await install();
    if (!accepted && !isInstallable) {
      setInstallModalOpen(true);
    }
  };

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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Search Button (hidden on mobile when menu drawer is open) */}
          {!mobileMenuOpen && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSearch();
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800 transition-all shadow-2xs group h-9"
              title="Search tools (⌘K)"
            >
              <Search className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Search tools...</span>
              <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Download Mobile App Button */}
          {!mobileMenuOpen && (
            isInstalled ? (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 px-3 py-1.5 text-xs font-semibold h-9 shadow-2xs">
                <Check className="h-3.5 w-3.5" />
                <span>App Installed</span>
              </span>
            ) : (
              <button
                onClick={handleInstallAction}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors h-9"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Install App</span>
              </button>
            )
          )}

          {/* Theme Toggle Button (hidden on mobile when menu drawer is open) */}
          {!mobileMenuOpen && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors lg:hidden shrink-0 ${
              mobileMenuOpen
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-slate-50/98 backdrop-blur-xl p-4 sm:p-5 lg:hidden dark:border-slate-800 dark:bg-slate-950/98 animate-in slide-in-from-top-2 duration-150 shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
          {/* Navigation Links with high-contrast text and crisp borders */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/' ? currentPath === '/' : currentPath.startsWith(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => handleLinkClick(link.path)}
                  className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all min-h-[42px] ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs dark:bg-indigo-950/60 dark:border-indigo-800/80 dark:text-indigo-300'
                      : 'text-slate-900 hover:bg-slate-200/70 hover:text-slate-950 border border-transparent dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {link.path === '/' && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? 'bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950'
                            : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                      />
                    )}
                    <span>{link.label}</span>
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Mobile App Download Button */}
          <div className="mt-3">
            {isInstalled ? (
              <div className="flex w-full items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 min-h-[42px]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pixora App Installed</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleInstallAction();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors min-h-[42px]"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Install Pixora Web App</span>
                </div>
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Recently Used in Mobile Drawer */}
          {recentTools.length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider">
                Recently Used
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentTools.slice(0, 4).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(tool);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 min-h-[32px] shadow-2xs transition-colors"
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Minimal Clean Appearance Toggle Switch Footer */}
          <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>Appearance ({theme === 'dark' ? 'Night / Dark' : 'Day / Light'})</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Drawer Menu Bottom Microcopy Links */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-400 px-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleLinkClick('/privacy')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
              >
                Privacy &amp; Terms
              </button>
              <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">|</span>
              <button
                onClick={() => handleLinkClick('/contact')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
              >
                Support
              </button>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">100% Client-Side</span>
          </div>
        </div>
      )}

      {/* PWA Install & Download Modal */}
      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />

      {/* iOS / Safari Fallback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 px-4 py-3 text-xs font-semibold text-white dark:text-slate-900 shadow-xl backdrop-blur-md max-w-sm text-center border border-slate-700/60 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-md hover:bg-white/20 dark:hover:bg-black/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
