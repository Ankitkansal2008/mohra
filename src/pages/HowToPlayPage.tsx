import React from 'react';
import { en } from '../copy/en.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import './ContentPages.css';

export function HowToPlayPage(): React.JSX.Element {
  usePageMetadata(en.howToPlayDocTitle, en.howToPlayMetaDescription);

  return (
    <article className="content-page" aria-labelledby="how-to-play-title">
      <h1 id="how-to-play-title">{en.howToPlayTitle}</h1>
      <p className="content-intro">{en.howToPlayIntro}</p>

      <div className="content-card-grid">
        {/* Card 1: How the pieces move */}
        <section className="content-card" aria-labelledby="card-pieces-title">
          <h2 id="card-pieces-title" className="content-card-title">{en.cardPiecesTitle}</h2>
          <ul className="content-piece-list">
            <li className="content-piece-item">{en.cardPiecesKing}</li>
            <li className="content-piece-item">{en.cardPiecesQueen}</li>
            <li className="content-piece-item">{en.cardPiecesRook}</li>
            <li className="content-piece-item">{en.cardPiecesBishop}</li>
            <li className="content-piece-item">{en.cardPiecesKnight}</li>
            <li className="content-piece-item">{en.cardPiecesPawn}</li>
          </ul>
          <div className="content-card-example">{en.cardPiecesExample}</div>
        </section>

        {/* Card 2: Castling */}
        <section className="content-card" aria-labelledby="card-castling-title">
          <h2 id="card-castling-title" className="content-card-title">{en.cardCastlingTitle}</h2>
          <p>{en.cardCastlingDesc}</p>
          <p>{en.cardCastlingRules}</p>
          <div className="content-card-example">{en.cardCastlingExample}</div>
        </section>

        {/* Card 3: En Passant */}
        <section className="content-card" aria-labelledby="card-en-passant-title">
          <h2 id="card-en-passant-title" className="content-card-title">{en.cardEnPassantTitle}</h2>
          <p>{en.cardEnPassantDesc}</p>
          <p>{en.cardEnPassantRules}</p>
          <div className="content-card-example">{en.cardEnPassantExample}</div>
        </section>

        {/* Card 4: Promotion */}
        <section className="content-card" aria-labelledby="card-promotion-title">
          <h2 id="card-promotion-title" className="content-card-title">{en.cardPromotionTitle}</h2>
          <p>{en.cardPromotionDesc}</p>
          <p>{en.cardPromotionRules}</p>
          <div className="content-card-example">{en.cardPromotionExample}</div>
        </section>
      </div>
    </article>
  );
}

export default HowToPlayPage;
