// Centred 11px muted footer displaying dynamic application version and build date.
import React from 'react';
import { getVersionMarker } from '../../lib/version.ts';
import './Footer.css';

export function Footer(): React.JSX.Element {
  return (
    <footer className="gambit-footer" role="contentinfo">
      {getVersionMarker()}
    </footer>
  );
}

export default Footer;
