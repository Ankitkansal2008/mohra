import { en } from '../copy/en.ts';
import type { Side } from '../game/types.ts';

// Map piece single-letter codes to localized spoken piece names.
const PIECE_NAMES: Record<string, string> = {
  p: en.piecePawn,
  n: en.pieceKnight,
  b: en.pieceBishop,
  r: en.pieceRook,
  q: en.pieceQueen,
  k: en.pieceKing,
};

// UI/UX Section 9: Screen reader announcements require plain language ("White plays knight to f3, check").
export function formatMoveAnnouncement(params: {
  side: Side;
  san: string;
  pieceType?: string;
  toSquare?: string;
  promotion?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}): string {
  const { side, san, pieceType = 'p', toSquare, promotion, isCheck, isCheckmate } = params;
  const sideLabel = side === 'w' ? en.white : en.black;

  let base = '';
  if (san.startsWith('O-O-O')) {
    base = en.moveAnnounceCastleQueenside.replace('{side}', sideLabel);
  } else if (san.startsWith('O-O')) {
    base = en.moveAnnounceCastleKingside.replace('{side}', sideLabel);
  } else {
    const dest = toSquare || san.replace(/^[NBRQK]/, '').replace(/[+#!?x]/g, '').slice(0, 2);
    if (promotion) {
      const promoPieceName = PIECE_NAMES[promotion.toLowerCase()] || en.pieceQueen;
      base = en.moveAnnouncePromotion
        .replace('{side}', sideLabel)
        .replace('{square}', dest)
        .replace('{piece}', promoPieceName);
    } else {
      const pieceName = PIECE_NAMES[pieceType.toLowerCase()] || en.piecePawn;
      base = en.moveAnnounce
        .replace('{side}', sideLabel)
        .replace('{piece}', pieceName)
        .replace('{square}', dest);
    }
  }

  if (isCheckmate || san.includes('#')) {
    return `${base}${en.checkmateSuffix}`;
  }
  if (isCheck || san.includes('+')) {
    return `${base}${en.checkSuffix}`;
  }
  return base;
}

// Formats store raw announced move string into the complete spoken announcement.
// e.g. "White plays Nf3+" -> "White plays knight to f3, check"
export function formatLiveMoveAnnouncement(raw: string | null): string {
  if (!raw) return '';
  const match = /^(White|Black) plays (.+)$/.exec(raw);
  if (!match) return raw;

  const sideLabel = match[1];
  const san = match[2];
  const side: Side = sideLabel === 'White' ? 'w' : 'b';

  // For pawn moves like "e4" or "e5", preserve direct announcement per store spec
  if (/^[a-h][1-8]$/.test(san)) {
    return `${sideLabel} plays ${san}`;
  }

  const pieceChar = /^[NBRQK]/.test(san) ? san[0].toLowerCase() : 'p';
  const destMatch = /([a-h][1-8])/.exec(san);
  const dest = destMatch ? destMatch[1] : '';
  const promoMatch = /=([NBRQ])/i.exec(san);
  const promotion = promoMatch ? promoMatch[1] : undefined;

  return formatMoveAnnouncement({
    side,
    san,
    pieceType: pieceChar,
    toSquare: dest,
    promotion,
    isCheck: san.includes('+'),
    isCheckmate: san.includes('#'),
  });
}

// Extracts piece at given square from FEN without mutating or allocating full Board objects.
export function getPieceAtSquare(
  fen: string,
  square: string,
): { color: 'w' | 'b'; type: string } | null {
  if (!/^[a-h][1-8]$/.test(square)) return null;
  const rows = fen.split(' ')[0].split('/');
  const fileIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const rowStr = rows[8 - rank];
  if (!rowStr) return null;

  let currentFile = 0;
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char >= '1' && char <= '8') {
      currentFile += parseInt(char, 10);
    } else {
      if (currentFile === fileIndex) {
        const color = char >= 'A' && char <= 'Z' ? 'w' : 'b';
        return { color, type: char.toLowerCase() };
      }
      currentFile += 1;
    }
    if (currentFile > fileIndex) break;
  }
  return null;
}

// Generates accessible label for a square in the board grid (e.g. "e4, white pawn" or "e4, empty").
export function formatSquareAriaLabel(
  square: string,
  piece: { color: 'w' | 'b'; type: string } | null,
): string {
  if (!piece) {
    return en.squareEmpty.replace('{square}', square);
  }
  const colorLabel = piece.color === 'w' ? en.white.toLowerCase() : en.black.toLowerCase();
  const pieceName = PIECE_NAMES[piece.type.toLowerCase()] || en.piecePawn;
  return en.squarePiece
    .replace('{square}', square)
    .replace('{color}', colorLabel)
    .replace('{piece}', pieceName);
}
