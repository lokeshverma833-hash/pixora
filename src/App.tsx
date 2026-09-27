/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { RecentToolsProvider } from './context/RecentToolsContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';

// Pages & Components
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { BlogPage, BlogPostPage } from './pages/BlogPage';
import { AboutPage } from './pages/AboutPage';
import { LegalPage } from './pages/LegalPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DownloadPage } from './components/pages/DownloadPage';
import { ToolRunner } from './components/tools/ToolRunner';

import { TOOLS } from './data/tools';
import { BLOG_POSTS } from './data/blog';
import { ToolItem, BlogPost } from './types';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [activeTool, setActiveTool] = useState<ToolItem | null>(null);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Sync state with URL pathname on popstate and initial mount
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);

      if (path.startsWith('/tools/')) {
        const slug = path.replace('/tools/', '');
        const found = TOOLS.find(
          (t) =>
            t.slug === slug ||
            t.id === slug ||
            (slug === 'change-aspect-ratio' && (t.slug === 'aspect-ratio' || t.id === 'aspect-ratio')) ||
            (slug === 'aspect-ratio' && (t.slug === 'change-aspect-ratio' || t.id === 'change-aspect-ratio'))
        );
        if (found) {
          setActiveTool(found);
          setActivePost(null);
          return;
        }
      }

      if (path.startsWith('/blog/')) {
        const slug = path.replace('/blog/', '');
        const found = BLOG_POSTS.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setActivePost(found);
          setActiveTool(null);
          return;
        }
      }

      setActiveTool(null);
      setActivePost(null);
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Global keydown for search shortcut Cmd+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);

    if (path.startsWith('/tools/')) {
      const slug = path.replace('/tools/', '');
      const found = TOOLS.find(
        (t) =>
          t.slug === slug ||
          t.id === slug ||
          (slug === 'change-aspect-ratio' && (t.slug === 'aspect-ratio' || t.id === 'aspect-ratio')) ||
          (slug === 'aspect-ratio' && (t.slug === 'change-aspect-ratio' || t.id === 'change-aspect-ratio'))
      );
      if (found) {
        setActiveTool(found);
        setActivePost(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '');
      const found = BLOG_POSTS.find((p) => p.slug === slug);
      if (found) {
        setActivePost(found);
        setActiveTool(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setActiveTool(null);
    setActivePost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTool = (tool: ToolItem) => {
    navigateTo(`/tools/${tool.slug}`);
  };

  const handleSelectToolBySlug = (slug: string) => {
    const found = TOOLS.find((t) => t.slug === slug || t.id === slug);
    if (found) {
      handleSelectTool(found);
    } else {
      navigateTo(`/tools/${slug}`);
    }
  };

  const handleSelectPost = (post: BlogPost) => {
    navigateTo(`/blog/${post.slug}`);
  };

  // Render Current Page / Tool View
  const renderContent = () => {
    // 1. Tool detail view
    if (currentPath.startsWith('/tools/') || activeTool) {
      const slug = currentPath.replace('/tools/', '');
      const tool = activeTool || TOOLS.find((t) => t.slug === slug || t.id === slug);
      if (tool) {
        return (
          <ToolRunner
            tool={tool}
            onSelectTool={handleSelectTool}
            onNavigate={navigateTo}
          />
        );
      }
      return <NotFoundPage onNavigate={navigateTo} onOpenSearch={() => setSearchModalOpen(true)} />;
    }

    // 2. Individual Blog Post View
    if (currentPath.startsWith('/blog/') || activePost) {
      const slug = currentPath.replace('/blog/', '');
      const post = activePost || BLOG_POSTS.find((p) => p.slug === slug);
      if (post) {
        return (
          <BlogPostPage
            post={post}
            onNavigate={navigateTo}
            onSelectToolBySlug={handleSelectToolBySlug}
          />
        );
      }
      return <NotFoundPage onNavigate={navigateTo} onOpenSearch={() => setSearchModalOpen(true)} />;
    }

    // 3. Category Views
    if (currentPath === '/image-tools') {
      return (
        <CategoryPage
          category="image"
          onSelectTool={handleSelectTool}
          onNavigate={navigateTo}
        />
      );
    }
    if (currentPath === '/pdf-tools') {
      return (
        <CategoryPage
          category="pdf"
          onSelectTool={handleSelectTool}
          onNavigate={navigateTo}
        />
      );
    }
    if (currentPath === '/ai-tools') {
      return (
        <CategoryPage
          category="ai"
          onSelectTool={handleSelectTool}
          onNavigate={navigateTo}
        />
      );
    }
    if (currentPath === '/utilities') {
      return (
        <CategoryPage
          category="utilities"
          onSelectTool={handleSelectTool}
          onNavigate={navigateTo}
        />
      );
    }

    // 4. Information Pages
    if (currentPath === '/download' || currentPath === '/app') {
      return <DownloadPage />;
    }
    if (currentPath === '/blog') {
      return <BlogPage onSelectPost={handleSelectPost} onNavigate={navigateTo} />;
    }
    if (currentPath === '/about') {
      return <AboutPage />;
    }
    if (currentPath === '/privacy') {
      return <LegalPage type="privacy" />;
    }
    if (currentPath === '/terms') {
      return <LegalPage type="terms" />;
    }
    if (currentPath === '/cookie-policy') {
      return <LegalPage type="cookies" />;
    }
    if (currentPath === '/disclaimer') {
      return <LegalPage type="disclaimer" />;
    }
    if (currentPath === '/contact') {
      return <ContactPage />;
    }

    // 5. Home Page
    if (currentPath === '/' || currentPath === '') {
      return (
        <HomePage
          onSelectTool={handleSelectTool}
          onNavigate={navigateTo}
          onOpenSearch={() => setSearchModalOpen(true)}
        />
      );
    }

    // 6. 404 Fallback
    return <NotFoundPage onNavigate={navigateTo} onOpenSearch={() => setSearchModalOpen(true)} />;
  };

  return (
    <ThemeProvider>
      <RecentToolsProvider>
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
          <Header
            currentPath={currentPath}
            onNavigate={navigateTo}
            onOpenSearch={() => setSearchModalOpen(true)}
            onSelectTool={handleSelectTool}
          />

          <main className="flex-1">{renderContent()}</main>

          <Footer
            onNavigate={navigateTo}
            onSelectToolBySlug={handleSelectToolBySlug}
          />

          <GlobalSearchModal
            isOpen={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            onSelectTool={handleSelectTool}
          />
        </div>
      </RecentToolsProvider>
    </ThemeProvider>
  );
}
