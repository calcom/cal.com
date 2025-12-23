import { useEffect } from 'react';

/**
 * Relays keyboard events from iframe to parent window.
 * This allows the parent to handle shortcuts even when iframe has focus.
 */
export function IframeKeyboardRelay() {
  useEffect(() => {
    // Only run if we're in an iframe
    if (window.self === window.top) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Only relay modifier key combinations to avoid breaking normal typing
      if (!isMod) return;

      // Relay the keyboard event to parent
      e.preventDefault();
      e.stopPropagation();

      window.parent.postMessage(
        {
          type: 'iframe-keydown',
          key: e.key,
          code: e.code,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        },
        '*',
      );
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
