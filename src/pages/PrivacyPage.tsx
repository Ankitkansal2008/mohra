import React from 'react';
import { en } from '../copy/en.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import './ContentPages.css';

export function PrivacyPage(): React.JSX.Element {
  usePageMetadata(en.privacyDocTitle, en.privacyMetaDescription);

  return (
    <article className="content-page" aria-labelledby="privacy-title">
      <h1 id="privacy-title">{en.privacyTitle}</h1>
      <p>{en.privacyP1}</p>

      <section className="content-section" aria-labelledby="analytics-heading">
        <h2 id="analytics-heading">{en.privacyAnalyticsTitle}</h2>
        <p>{en.privacyAnalyticsDesc}</p>
      </section>

      <section className="content-section" aria-labelledby="storage-heading">
        <h2 id="storage-heading">{en.privacyStorageTitle}</h2>
        <p>{en.privacyStorageDesc}</p>
      </section>

      <section className="content-section" aria-labelledby="clear-heading">
        <h2 id="clear-heading">{en.privacyClearTitle}</h2>
        <p>{en.privacyClearDesc}</p>
      </section>

      <section className="content-section" aria-labelledby="contact-heading">
        <h2 id="contact-heading">{en.privacyContactTitle}</h2>
        <p>{en.privacyContactDesc}</p>
      </section>
    </article>
  );
}

export default PrivacyPage;
