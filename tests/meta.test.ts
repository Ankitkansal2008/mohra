import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Social preview and metadata in index.html', () => {
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  it('asserts og:title tag exists in index.html', () => {
    expect(indexHtml).toMatch(/<meta\s+property=["']og:title["']\s+content=["']Mohra - play chess in your browser["']\s*\/?>/);
  });

  it('asserts og:image tag exists in index.html', () => {
    expect(indexHtml).toMatch(/<meta\s+property=["']og:image["']\s+content=["'][^"']*og-image\.png["']\s*\/?>/);
  });

  it('asserts title and meta description exist with required text', () => {
    expect(indexHtml).toContain('<title>Mohra - play chess in your browser</title>');
    expect(indexHtml).toContain(
      'content="Play chess in your browser against the computer at three levels, or a friend on the same device. Free, no signup, no install."',
    );
  });

  it('asserts theme-color and canonical link exist', () => {
    expect(indexHtml).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#2F4F3E["']\s*\/?>/);
    expect(indexHtml).toMatch(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/);
  });

  it('asserts remaining Open Graph tags exist with required values', () => {
    expect(indexHtml).toMatch(/<meta\s+property=["']og:type["']\s+content=["']website["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+property=["']og:site_name["']\s+content=["']Mohra["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+property=["']og:image:width["']\s+content=["']1200["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+property=["']og:image:height["']\s+content=["']630["']\s*\/?>/);
    expect(indexHtml).toMatch(
      /<meta\s+property=["']og:image:alt["']\s+content=["']Mohra - play chess in your browser["']\s*\/?>/,
    );
  });

  it('asserts Twitter summary_large_image card tags exist', () => {
    expect(indexHtml).toMatch(/<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+name=["']twitter:title["']\s+content=["']Mohra - play chess in your browser["']\s*\/?>/);
    expect(indexHtml).toContain(
      'name="twitter:description"\n      content="Play chess in your browser against the computer at three levels, or a friend on the same device. Free, no signup, no install."',
    );
    expect(indexHtml).toMatch(/<meta\s+name=["']twitter:image["']\s+content=["'][^"']*og-image\.png["']\s*\/?>/);
  });

  it('preserves existing favicon and apple-touch-icon links', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/icon-512.png" />');
  });

  it('the viewport meta does not contain user-scalable=no', () => {
    expect(indexHtml).not.toContain('user-scalable=no');
    expect(indexHtml).not.toContain('maximum-scale');
    expect(indexHtml).toMatch(/<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']\s*\/?>/);
    expect(indexHtml).toMatch(/<meta\s+name=["']viewport["']\s+content=["'][^"']*initial-scale=1/);
  });

  it('replaces %VITE_SITE_URL% with absolute origin in built dist/index.html', () => {
    const distHtmlPath = path.resolve(__dirname, '../dist/index.html');
    if (fs.existsSync(distHtmlPath)) {
      const distHtml = fs.readFileSync(distHtmlPath, 'utf-8');
      expect(distHtml).not.toContain('%VITE_SITE_URL%');
      expect(distHtml).toContain('https://mohra.pages.dev/og-image.png');
      expect(distHtml).toContain('https://mohra.pages.dev/');
    }
  });
});

