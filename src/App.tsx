import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  MemoryRouter,
  Route,
  Routes,
  useInRouterContext,
  useNavigate,
} from 'react-router-dom';
import { Chess } from 'chess.js';
import { Footer } from './components/Footer/Footer.tsx';
import { Header } from './components/Header/Header.tsx';
import { SettingsDialog } from './components/Dialogs/SettingsDialog.tsx';
import { connectBridgeToStore, initEngine } from './engine/bridge.ts';
import { isGameOver } from './game/selectors.ts';
import { useGameStore } from './game/store.ts';
import type { GameState } from './game/types.ts';
import { clearSavedGame, isSaveUnder24Hours, loadSavedGame } from './lib/persist.ts';
import { AboutPage } from './pages/AboutPage.tsx';
import { GamePage } from './pages/GamePage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { HowToPlayPage } from './pages/HowToPlayPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import './App.css';

function loadDevFenIfPresent(): boolean {
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const fenParam = new URLSearchParams(window.location.search).get('fen');
      if (fenParam) {
        const trimmed = fenParam.trim();
        new Chess(trimmed);
        useGameStore.getState().loadFen(trimmed);
        useGameStore.getState().dismissToast();
        return true;
      }
    } catch {}
  }
  return false;
}

function AppContent(): React.JSX.Element {
  const navigate = useNavigate();
  // Execute DEV query param loading during render so SSR / renderToStaticMarkup also picks it up
  const [fenLoaded] = useState<boolean>(() => loadDevFenIfPresent());
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMovesOpen, setIsMovesOpen] = useState<boolean>(false);

  const game = useGameStore((s) => s.game);
  const movesCount = game.moves.length;
  const reviewPly = useGameStore((s) => s.ui.reviewPly);

  // Automatically reveal move panel when entering review mode from ResultDialog
  useEffect(() => {
    if (reviewPly !== null) setIsMovesOpen(true);
  }, [reviewPly]);

  // Lock body scroll while mobile bottom sheet or tablet drawer is open
  useEffect(() => {
    if (!isMovesOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMovesOpen]);

  // Close drawer or bottom sheet on Escape key press
  useEffect(() => {
    if (!isMovesOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMovesOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMovesOpen]);

  useEffect(() => {
    initEngine();
    const disconnect = connectBridgeToStore();

    // Development-only ?fen=<fen> query parameter loading
    if (fenLoaded) {
      navigate('/play');
    }

    // Load saved game if present
    const saved = loadSavedGame();
    if (saved && !isGameOver(saved.status) && isSaveUnder24Hours(saved.savedAt) && saved.moves.length > 0) {
      setSavedGame(saved);
    } else if (saved && isGameOver(saved.status)) {
      clearSavedGame();
    }

    // Running clock timer ticks active side every 200ms
    const clockTimer = setInterval(() => {
      useGameStore.getState().tickClock();
    }, 200);

    return () => {
      disconnect();
      clearInterval(clockTimer);
    };
  }, [navigate]);

  const handleHeaderNewGame = (): void => {
    useGameStore.getState().returnToSetup();
    navigate('/play');
  };

  return (
    <div className="app-shell">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMoves={() => setIsMovesOpen((prev) => !prev)}
        onNewGame={handleHeaderNewGame}
        isMovesOpen={isMovesOpen}
        movesCount={movesCount}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/play"
          element={
            <GamePage
              isMovesOpen={isMovesOpen}
              setIsMovesOpen={setIsMovesOpen}
              savedGame={savedGame}
              setSavedGame={setSavedGame}
            />
          }
        />
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>

      <Footer />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export interface AppProps {
  readonly initialRoute?: string;
}

export function App(props: AppProps): React.JSX.Element;
export function App(): React.JSX.Element;
export function App({ initialRoute }: AppProps = {}): React.JSX.Element {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return <AppContent />;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const search = typeof window !== 'undefined' && window.location?.search ? window.location.search : '';
    const initialEntry = initialRoute ?? (search ? `/${search}` : '/');
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppContent />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
