// Lightweight, cookieless telemetry via Umami Cloud.
// Injected only in production when VITE_UMAMI_ID is provided.
// No-op in development and when the external tracker is absent.

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void;
    };
  }
}

let isInitialized = false;

export function initAnalytics(): void {
  const umamiId = import.meta.env.VITE_UMAMI_ID;
  if (!import.meta.env.PROD || !umamiId || typeof document === 'undefined') {
    return;
  }

  if (isInitialized && document.querySelector('script[src="https://cloud.umami.is/script.js"]')) {
    return;
  }
  if (document.querySelector('script[src="https://cloud.umami.is/script.js"]')) {
    isInitialized = true;
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.setAttribute('data-website-id', umamiId);
  document.head.appendChild(script);
  isInitialized = true;
}

export function track(event: string, data?: Record<string, string | number>): void {
  if (import.meta.env.DEV) {
    return;
  }

  if (typeof window === 'undefined' || !window.umami || typeof window.umami.track !== 'function') {
    return;
  }

  try {
    window.umami.track(event, data);
  } catch {
    // Suppress tracker exceptions so failures cannot disrupt the game.
  }
}
