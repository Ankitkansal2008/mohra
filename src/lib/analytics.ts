// Lightweight, cookieless telemetry via Umami Cloud.
// No-op in development and when the external tracker is absent.

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void;
    };
  }
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

