import React from 'react';
import { BookOpen, Clock, Calendar, ArrowRight, User } from 'lucide-react';
import { BLOG_POSTS } from '../data/blog';
import { BlogPost } from '../types';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { SeoHead } from '../components/common/SeoHead';

interface BlogPageProps {
  onSelectPost: (post: BlogPost) => void;
  onNavigate: (path: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onSelectPost, onNavigate }) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SeoHead
        title="Guides, Tutorials & Best Practices — Pixora Tools Blog"
        description="Learn image compression optimization, official passport size rules, PDF security standards, and modern web codecs."
        canonicalPath="/blog"
      />

      <Breadcrumbs items={[{ label: 'Blog & Guides' }]} />

      <div className="mb-12 text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Knowledge Base & Guides
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Image & Document Engineering
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Technical deep-dives into compression algorithms, biometric photo requirements, and browser-side file privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.id}
            onClick={() => onSelectPost(post)}
            className="group cursor-pointer rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-2xs hover:border-indigo-400/90 hover:shadow-xs hover:-translate-y-0.5 dark:border-slate-800/80 dark:bg-slate-900 transition-all duration-150 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Unboxed clean metadata */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {post.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>{post.readTime}</span>
                <span aria-hidden="true">·</span>
                <span>{post.date}</span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-snug">
                {post.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{post.author}</span>
              </div>

              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                Read Guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export const BlogPostPage: React.FC<{
  post: BlogPost;
  onNavigate: (path: string) => void;
  onSelectToolBySlug: (slug: string) => void;
}> = ({ post, onNavigate, onSelectToolBySlug }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <SeoHead
        title={`${post.title} — Pixora Tools`}
        description={post.excerpt}
        canonicalPath={`/blog/${post.slug}`}
      />

      <Breadcrumbs
        items={[
          { label: 'Blog & Guides', onClick: () => onNavigate('/blog') },
          { label: post.title },
        ]}
      />

      <header className="mb-10 space-y-4">
        {/* Unboxed metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {post.category}
          </span>
          <span aria-hidden="true">·</span>
          <span>{post.date}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readTime}</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <User className="h-4 w-4" />
          <span>Written by {post.author}</span>
        </div>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
        {post.content.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>

      {/* Helpful links card */}
      <div className="mt-12 rounded-3xl bg-slate-50 p-6 sm:p-8 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <h4 className="font-display text-base font-bold text-slate-900 dark:text-white mb-2">
          Ready to try it yourself?
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          All our utilities are 100% free and run completely in your browser without remote file uploads.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectToolBySlug('compress-image')}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors"
          >
            Compress Image
          </button>
          <button
            onClick={() => onSelectToolBySlug('passport-photo')}
            className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors"
          >
            Passport Photo Maker
          </button>
          <button
            onClick={() => onSelectToolBySlug('merge-pdf')}
            className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors"
          >
            Merge PDF
          </button>
        </div>
      </div>
    </div>
  );
};
