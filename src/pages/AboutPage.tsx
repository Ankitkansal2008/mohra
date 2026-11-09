import React from 'react';
import { en } from '../copy/en.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import './ContentPages.css';

export function AboutPage(): React.JSX.Element {
  usePageMetadata(en.aboutDocTitle, en.aboutMetaDescription);

  return (
    <article className="content-page" aria-labelledby="about-title">
      <h1 id="about-title">{en.aboutTitle}</h1>
      <p>{en.aboutP1}</p>
      <p>{en.aboutP2}</p>
      <p>{en.aboutP3}</p>
    </article>
  );
}

export default AboutPage;
