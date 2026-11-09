// Centred muted footer with navigation links, version, copyright, and developer credit
import React from 'react';
import { en } from '../../copy/en.ts';
import { getVersionMarker } from '../../lib/version.ts';
import { AppLink } from '../Common/AppLink.tsx';
import './Footer.css';

export function Footer(): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  const copyright = en.copyright.replace('{year}', String(currentYear));

  return (
    <footer className="gambit-footer" role="contentinfo">
      <nav className="gambit-footer-nav" aria-label="Footer">
        <AppLink to="/" className="gambit-footer-link">
          {en.navPlay}
        </AppLink>
        <AppLink to="/how-to-play" className="gambit-footer-link">
          {en.navHowToPlay}
        </AppLink>
        <AppLink to="/about" className="gambit-footer-link">
          {en.navAbout}
        </AppLink>
        <AppLink to="/privacy" className="gambit-footer-link">
          {en.navPrivacy}
        </AppLink>
      </nav>
      <div>{getVersionMarker()}</div>
      <div>{copyright}</div>
      <div>{en.developerCredit}</div>
    </footer>
  );
}

export default Footer;
