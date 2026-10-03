import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Instant Auto-Update PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  let refreshing = false;

  // Sleek bottom toast when update takes over
  const showUpdateToast = () => {
    if (document.getElementById('pixora-update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'pixora-update-toast';
    toast.className =
      'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 text-xs font-semibold tracking-wide animate-bounce';
    toast.innerHTML = `
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Update Available — Reloading to latest version...</span>
    `;
    document.body.appendChild(toast);
  };

  // Listen for controllerchange event when a new service worker takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      showUpdateToast();
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Immediate update check upon registration
        reg.update().catch(() => {});

        // Re-check for updates when user returns to tab
        window.addEventListener('focus', () => {
          reg.update().catch(() => {});
        });
      })
      .catch((err) => console.debug('ServiceWorker registration note:', err));
  });
}
