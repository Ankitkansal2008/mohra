import type React from 'react';
import { en } from '../../copy/en.ts';

export interface ToastProps {
  readonly message: string;
  readonly onDismiss?: () => void;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export function Toast({
  message,
  onDismiss,
  className = '',
  style,
}: ToastProps): React.JSX.Element {
  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label={en.toastAriaLabel}
      className={`gambit-toast ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-12, 12px)',
        padding: 'var(--spacing-8, 8px) var(--spacing-16, 16px)',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        color: 'var(--color-ink, #1A1A1A)',
        borderLeft: '4px solid var(--color-danger, #C0392B)',
        borderTop: '1px solid var(--color-border, #E2E6DE)',
        borderRight: '1px solid var(--color-border, #E2E6DE)',
        borderBottom: '1px solid var(--color-border, #E2E6DE)',
        borderRadius: 'var(--radius-6, 6px)',
        boxShadow: '0 2px 8px rgba(20, 26, 20, 0.10)',
        fontSize: '14px',
        lineHeight: 1.5,
        maxWidth: '100%',
        transition: 'opacity var(--duration-120, 120ms) ease-out',
        ...style,
      }}
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted, #5A5A5A)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: 'var(--spacing-4, 4px)',
            lineHeight: 1,
          }}
          aria-label={en.dismissToast}
        >
          ×
        </button>
      ) : null}
    </aside>
  );
}

export default Toast;

