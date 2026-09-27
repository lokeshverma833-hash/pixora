import React, { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  toolName?: string;
  ogImage?: string;
  category?: string;
  faq?: { question: string; answer: string }[];
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath = '',
  toolName,
  ogImage,
  category,
  faq,
}) => {
  useEffect(() => {
    // 1. Update Document Title
    const formattedTitle = title.includes('Pixora') ? title : `${title} — Pixora Tools`;
    document.title = formattedTitle;

    // Helper function to set or create meta tags
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let meta = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);

    // 3. Open Graph Meta Tags
    const currentOrigin = window.location.origin;
    const currentUrl = `${currentOrigin}${canonicalPath || window.location.pathname}`;
    const previewImage = ogImage || `${currentOrigin}/icon-512.png`;

    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:url', currentUrl);
    setMetaTag('property', 'og:site_name', 'Pixora Tools');
    setMetaTag('property', 'og:image', previewImage);
    setMetaTag('property', 'og:image:width', '512');
    setMetaTag('property', 'og:image:height', '512');
    setMetaTag('property', 'og:image:alt', toolName ? `${toolName} - Pixora Online Tool` : 'Pixora Tools');
    if (category) {
      setMetaTag('property', 'article:section', category);
    }

    // 4. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', previewImage);
    setMetaTag('name', 'twitter:image:alt', toolName ? `${toolName} - Pixora Online Tool` : 'Pixora Tools');
    setMetaTag('name', 'twitter:url', currentUrl);

    // 5. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', currentUrl);

    // 6. Schema.org JSON-LD Structured Data
    const schemaData: any = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: toolName || 'Pixora Tools',
      applicationCategory: category ? `${category.toUpperCase()}Application` : 'UtilityApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      url: currentUrl,
      description: description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    };

    if (faq && faq.length > 0) {
      schemaData.mainEntity = faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      }));
    }

    let scriptTag = document.getElementById('pixora-schema-jsonld') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'pixora-schema-jsonld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schemaData);
  }, [title, description, canonicalPath, toolName, ogImage, category, faq]);

  return null;
};

