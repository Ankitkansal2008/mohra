export const en: Record<string, string> = {
  // Board & Accessibility
  boardAriaLabel: 'Chess board',
  dismissToast: 'Dismiss notification',
  toastAriaLabel: 'Notification',
  announcedMove: 'Move played: ',

  // Rejection reasons (UI/UX Section 8 and TRD Section 5)
  rejectionPinned: 'That piece is pinned - moving it would expose your king.',
  rejectionWrongTurn: 'It is not your turn to move.',
  rejectionIllegalShape: 'That piece cannot reach that square from here.',
  rejectionInCheck: 'You are in check - that move leaves your king attacked.',
  rejectionCastlingBlocked: 'You cannot castle out of, through, or into check.',
  rejectionGameOver: 'The game has ended.',

  // Promotion overlay (UI/UX Section 6 and 7)
  promotionDialogAriaLabel: 'Pawn promotion choices',
  promoteToQueen: 'Promote to Queen',
  promoteToRook: 'Promote to Rook',
  promoteToBishop: 'Promote to Bishop',
  promoteToKnight: 'Promote to Knight',
  cancelPromotion: 'Cancel promotion',

  // UI/UX Section 8 copy tokens
  homePlayComputer: 'Play the computer',
  homeTwoPlayers: 'Two players, one device',
  boardHintFirstRun: 'Tap a piece to see where it can go.',
  thinking: 'Thinking...',
  undoComputer: 'Take back your move and the computer\'s reply.',
  undoStart: 'Nothing to undo yet.',
  resignConfirm: 'Resign this game? The result is final.',
  resignConfirmAction: 'Resign',
  checkmate: 'Checkmate. {Winner} wins.',
  checkmateDetail: '{Loser} has no legal move and the king is attacked.',
  stalemate: 'Stalemate. It\'s a draw.',
  stalemateDetail: '{Side} has no legal move, but the king is not attacked.',
  repetition: 'Draw by repetition.',
  repetitionDetail: 'The same position occurred three times.',
  fiftyMove: 'Draw by the fifty-move rule.',
  fiftyMoveDetail: 'Fifty moves each with no capture and no pawn move.',
  insufficientMaterial: 'Draw. Not enough material to checkmate.',
  resigned: '{Player} resigned. {Winner} wins.',
  timeout: '{Player} ran out of time. {Winner} wins.',
  pgnCopied: 'Game copied as PGN.',
  engineFailed: 'The computer opponent could not start. You can keep playing on this device.',
  offline: 'You are offline. The game still works; only the online features will not.',

  // Actions and controls (PRD FR-12, FR-13, FR-17, FR-19 and UI/UX Section 7, 8)
  rematch: 'Rematch',
  reviewMoves: 'Review moves',
  reviewMovesDisabled: 'Available once the move list is built',
  copyPgn: 'Copy PGN',
  downloadPgn: 'Download PGN',
  undo: 'Undo',
  flip: 'Flip',
  resign: 'Resign',
  cancel: 'Cancel',
  newGame: 'New game',

  // Player labels and turn indicators
  you: 'You',
  gambit: 'Gambit',
  player1: 'Player 1',
  player2: 'Player 2',
  white: 'White',
  black: 'Black',
  toMove: 'To move',
  levelLabel: 'Level {level}',

  // Moves list & review mode
  moves: 'Moves',
  noMovesYet: 'No moves yet. White to play.',
  returnToGame: 'Return to game',
  reviewingMove: 'Reviewing move {move}',

  // Persistence & Resume
  resumeGame: 'Resume game - {turn} to move, move {move}',
  resume: 'Resume',
  discard: 'Discard',

  // Settings
  settings: 'Settings',
  settingsTitle: 'Settings',
  close: 'Close',
  soundSetting: 'Sound',
  themeSetting: 'Board theme',
  themeDefault: 'Green',
  themeSlate: 'Slate',
  animationSetting: 'Piece animation',
  coordsSetting: 'Coordinates',
  clockSetting: 'Clock (10 min)',
  on: 'On',
  off: 'Off',

  // Dev position loader
  loadFen: 'Load FEN',
  loadFenLabel: 'Load FEN',
  loadFenPlaceholder: 'Paste FEN...',
  loadFenSubmit: 'Load',
  invalidPosition: 'That position is not valid.',
  invalidFen: 'That position is not valid.',
};

export const copy: Record<string, string> = en;

export default en;
