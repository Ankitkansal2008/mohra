/* eslint-disable react-hooks/rules-of-hooks, react/refs */
import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Returns an array of focusable HTML elements inside a container,
 * filtering out disabled elements, hidden elements, and tabindex="-1".
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tabIndex === -1) return false;
    return true;
  });
}

/**
 * Traps focus within a dialog container, focusing the first focusable control,
 * wrapping Tab / Shift+Tab navigation, handling Escape dismissal, and restoring
 * focus to the trigger element when the dialog closes.
 */
export function setupFocusTrap(
  container: HTMLElement,
  onClose?: () => void,
): () => void {
  // Capture the element that opened the dialog so focus can be returned on close
  const triggerElement =
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null;

  // Immediately move focus to the first focusable control
  const focusables = getFocusableElements(container);
  if (focusables.length > 0) {
    focusables[0].focus();
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      if (onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      return;
    }

    if (e.key === 'Tab') {
      const currentFocusables = getFocusableElements(container);
      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const active = typeof document !== 'undefined' ? document.activeElement : null;

      if (e.shiftKey) {
        // Shift + Tab on the first control wraps to the last
        if (active === first || !container.contains(active as Node)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on the last control wraps to the first
        if (active === last || !container.contains(active as Node)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
    // Return focus to the trigger element that opened the dialog
    if (triggerElement && typeof triggerElement.focus === 'function') {
      try {
        triggerElement.focus();
      } catch {}
    }
  };
}

function isInsideReact(): boolean {
  try {
    const internals = (React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown };
    }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    return !!internals?.H;
  } catch {
    return false;
  }
}

function isRefObject<T>(val: unknown): val is React.RefObject<T | null> {
  return typeof val === 'object' && val !== null && 'current' in val;
}

/**
 * Hook to manage focus trapping, keyboard navigation, and focus restoration
 * for accessible modal dialogs.
 *
 * Supports both signatures:
 *   useFocusTrap(containerRef, onClose, enabled)
 *   const containerRef = useFocusTrap(onClose, enabled)
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  refOrOnClose?: React.RefObject<T | null> | (() => void),
  onCloseOrEnabled?: (() => void) | boolean,
  maybeEnabled?: boolean,
): React.RefObject<T | null> {
  let ref: React.RefObject<T | null> | undefined;
  let onClose: (() => void) | undefined;
  let enabled = true;

  if (isRefObject<T>(refOrOnClose)) {
    ref = refOrOnClose;
    if (typeof onCloseOrEnabled === 'function') {
      onClose = onCloseOrEnabled;
    }
    if (typeof maybeEnabled === 'boolean') {
      enabled = maybeEnabled;
    }
  } else {
    if (typeof refOrOnClose === 'function') {
      onClose = refOrOnClose;
    }
    if (typeof onCloseOrEnabled === 'boolean') {
      enabled = onCloseOrEnabled;
    }
  }

  // Support direct function calls in test environments without throwing invalid hook errors
  if (!isInsideReact()) {
    return ref ?? { current: null };
  }

  const internalRef = useRef<T | null>(null);
  const targetRef = ref ?? internalRef;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const container = targetRef.current;
    if (!container) return;

    return setupFocusTrap(container, onCloseRef.current);
  }, [enabled, targetRef]);

  return targetRef;
}

export default useFocusTrap;
