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
  opponent: 'Opponent',
  difficulty: 'Difficulty',
  levelBeginner: 'Beginner',
  levelCasual: 'Casual',
  levelClub: 'Club',
  levelStrong: 'Strong',
  levelHelpBeginner: 'Beginner makes mistakes on purpose so you can win.',
  playAs: 'Play as',
  random: 'Random',
  clock: 'Clock',
  tenMinutes: '10 minutes',
  start: 'Start',
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

  // Player labels, clock and turn indicators
  you: 'You',
  mohra: 'Mohra',
  gambit: 'Mohra',
  player1: 'Player 1',
  player2: 'Player 2',
  white: 'White',
  black: 'Black',
  toMove: 'To move',
  levelLabel: 'Level {level}',
  playerClock: '{player} clock: {time}',

  // Moves list, drawer & review mode
  moves: 'Moves',
  noMovesYet: 'No moves yet. White to play.',
  returnToGame: 'Return to game',
  reviewingMove: 'Reviewing move {move}',
  movesDrawerTitle: 'Moves',
  closeMovesDrawer: 'Close moves list',
  openMovesDrawer: 'Moves',

  // Screen reader piece & square announcements (UI/UX Section 9)
  piecePawn: 'pawn',
  pieceKnight: 'knight',
  pieceBishop: 'bishop',
  pieceRook: 'rook',
  pieceQueen: 'queen',
  pieceKing: 'king',
  moveAnnounce: '{side} plays {piece} to {square}',
  moveAnnounceCastleKingside: '{side} castles kingside',
  moveAnnounceCastleQueenside: '{side} castles queenside',
  moveAnnouncePromotion: '{side} plays pawn to {square}, promotes to {piece}',
  checkSuffix: ', check',
  checkmateSuffix: ', checkmate',
  squareEmpty: '{square}, empty',
  squarePiece: '{square}, {color} {piece}',
  boardKeyboardInstructions: 'Chess board. Use arrow keys to navigate squares, Enter or Space to select and move, Escape to cancel, F to flip.',

  // Persistence & Resume
  resumeGame: 'Resume game - {turn} to move, move {move}',
  resume: 'Resume',
  discard: 'Discard',

  // Settings
  settings: 'Settings',
  settingsTitle: 'Settings',
  close: 'Close',
  menu: 'Menu',
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

  // Footer & Version Marker
  versionMarker: 'v{version} • {buildDate}',
};

export const copy: Record<string, string> = en;

export default en;
