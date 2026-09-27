import React from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { SeoHead } from '../components/common/SeoHead';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'cookies' | 'disclaimer';
}

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const configs = {
    privacy: {
      title: 'Privacy Policy',
      path: '/privacy',
      desc: 'Our client-side first privacy commitment: we do not harvest or store your files.',
      content: [
        {
          heading: '1. Commitment to Privacy & Local Processing',
          text: 'At Pixora Tools, we adhere strictly to the principle of data minimization. The majority of our utilities—including image compression, resizing, cropping, EXIF removal, and PDF merging/splitting—execute 100% locally in your browser through HTML5 APIs and WebAssembly. Your files are not uploaded or transmitted to our servers.',
        },
        {
          heading: '2. Server-Side AI Operations',
          text: 'When you choose to use an AI-assisted feature (such as AI Photo Enhancement or Vision OCR), the necessary image data is securely transmitted via TLS encryption to our server-side API proxy to generate the request to the AI model. This data is processed ephemerally and is not saved to any database or file system.',
        },
        {
          heading: '3. No Analytics Tracking of Document Contents',
          text: 'We never analyze, inspect, or log the visual or textual content of your files. Basic operational metrics (such as page views) may be collected to monitor uptime and site availability.',
        },
      ],
    },
    terms: {
      title: 'Terms of Service',
      path: '/terms',
      desc: 'Terms governing the fair use of Pixora Tools web application.',
      content: [
        {
          heading: '1. Acceptance of Terms',
          text: 'By accessing and using Pixora Tools, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue use of the site.',
        },
        {
          heading: '2. Lawful Use & Prohibited Activities',
          text: 'You agree to use our utilities solely for lawful purposes. You may not use the services to process illegal, harassing, infringing, or malicious content.',
        },
        {
          heading: '3. Intellectual Property Rights',
          text: 'You retain full ownership and all copyright rights to any images or documents you process through Pixora Tools. We claim zero ownership or license over your materials.',
        },
      ],
    },
    cookies: {
      title: 'Cookie Policy',
      path: '/cookie-policy',
      desc: 'Information regarding cookie usage and local preferences.',
      content: [
        {
          heading: '1. Use of Local Storage',
          text: 'Pixora Tools utilizes browser LocalStorage solely to remember your chosen user interface preferences (such as Dark/Light theme mode) and your recently used tools list. This data never leaves your device.',
        },
        {
          heading: '2. Third-Party Tracking',
          text: 'We do not sell your personal data or utilize intrusive third-party cross-site advertising tracking cookies.',
        },
      ],
    },
    disclaimer: {
      title: 'Disclaimer',
      path: '/disclaimer',
      desc: 'Important notices regarding document compliance and utility results.',
      content: [
        {
          heading: '1. "As-Is" Service Warranty',
          text: 'Pixora Tools is provided on an "as-is" and "as-available" basis. While we strive for rigorous precision in file conversions and biometric photo dimensions, users are responsible for verifying compliance with specific consulate or government portal regulations prior to submission.',
        },
        {
          heading: '2. Limitation of Liability',
          text: 'In no event shall Pixora Tools or its contributors be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this platform.',
        },
      ],
    },
  };

  const current = configs[type];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <SeoHead
        title={`${current.title} — Pixora Tools`}
        description={current.desc}
        canonicalPath={current.path}
      />

      <Breadcrumbs items={[{ label: current.title }]} />

      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {current.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last revised: September 2026
        </p>
      </header>

      <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {current.content.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {sec.heading}
            </h2>
            <p>{sec.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
