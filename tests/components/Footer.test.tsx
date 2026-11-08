import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from '../../src/components/Footer/Footer.tsx';
import { en } from '../../src/copy/en.ts';
import { APP_VERSION, BUILD_DATE, getVersionMarker } from '../../src/lib/version.ts';

describe('Footer component', () => {
  it('renders 11px muted footer with v1.2.0, build date, and copyright', () => {
    const html = renderToStaticMarkup(React.createElement(Footer));
    expect(html).toContain('class="gambit-footer"');
    expect(html).toContain('role="contentinfo"');
    expect(html).toContain(`v${APP_VERSION}`);
    expect(html).toContain('v1.2.0');
    expect(html).toContain(BUILD_DATE);
    expect(html).toContain(`© ${new Date().getFullYear()} Mohra. All rights reserved.`);
    expect(html).toContain('Developed by Ankit Kansal');
  });

  it('formats custom version and build date through en.versionMarker template', () => {
    const result = getVersionMarker('1.0.0', '2026-11-07');
    expect(result).toBe('v1.0.0 • 2026-11-07');
    expect(en.versionMarker).toBe('v{version} • {buildDate}');
  });

  it('contains copyright template in en copy dictionary', () => {
    expect(en.copyright).toBe('© {year} Mohra. All rights reserved.');
    expect(en.developerCredit).toBe('Developed by Ankit Kansal');
  });
});

