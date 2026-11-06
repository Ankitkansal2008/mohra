// Sourced from Vite defines with package.json version and build date.
import { en } from '../copy/en.ts';

// Defined at build time by Vite, with safe fallbacks for test environments
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ !== 'undefined'
    ? __BUILD_DATE__
    : new Date().toISOString().split('T')[0] ?? '';

export function getVersionMarker(
  version: string = APP_VERSION,
  buildDate: string = BUILD_DATE,
): string {
  return en.versionMarker
    .replace('{version}', version)
    .replace('{buildDate}', buildDate);
}

