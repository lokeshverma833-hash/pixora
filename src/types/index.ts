export type ToolCategory = 'image' | 'pdf' | 'ai' | 'utilities';

export interface ToolItem {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  shortDesc: string;
  icon: string;
  popular?: boolean;
  badge?: 'Popular' | 'Hot' | 'AI' | 'Fast' | 'New';
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  features: string[];
  howToSteps: {
    step: number;
    title: string;
    description: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
}

export interface ProcessingResult {
  blob: Blob;
  url: string;
  fileName: string;
  fileSize: number;
  originalSize: number;
  width?: number;
  height?: number;
  mimeType: string;
  pages?: { pageNumber: number; url: string; fileName: string; fileSize: number }[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  content: string[];
}
