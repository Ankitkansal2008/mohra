// Centred 11px muted footer displaying dynamic application version and copyright.
import React from 'react';
import { en } from '../../copy/en.ts';
import { getVersionMarker } from '../../lib/version.ts';
import './Footer.css';

export function Footer(): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  const copyright = en.copyright.replace('{year}', String(currentYear));

  return (
    <footer className="gambit-footer" role="contentinfo">
      <div>{getVersionMarker()}</div>
      <div>{copyright}</div>
      <div>{en.developerCredit}</div>
    </footer>
  );
}

export default Footer;

