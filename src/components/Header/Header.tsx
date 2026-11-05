import type React from 'react';
import { FenLoader } from './FenLoader.tsx';
import './Header.css';

export function Header(): React.JSX.Element {
  return (
    <header className="gambit-header" role="banner">
      {/* Dev-only controls are eliminated from production builds via dead-code elimination */}
      {import.meta.env.DEV ? <FenLoader /> : null}
    </header>
  );
}

export default Header;

