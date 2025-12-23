import { useEffect } from 'react';
import { extractElementData } from './utils';

/**
 * ElementInspector - Runs inside the Storybook iframe.
 *
 * Responsibilities:
 * 1. Respond to parent mouse position messages with element data at those coordinates
 * 2. Support the overlay-based element selection pattern
 */
export function ElementInspector() {
  useEffect(() => {
    // Only run if we're in an iframe
    if (window.self === window.top) return;

    // Listen for mouse position from parent overlay
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'parent-mouse-position') {
        const { x, y } = event.data;

        const element = document.elementFromPoint(x, y);

        if (element) {
          const elementData = extractElementData(element as HTMLElement);

          window.parent.postMessage(
            { type: 'iframe-element-at-position', element: elementData },
            '*',
          );
        } else {
          window.parent.postMessage(
            { type: 'iframe-element-at-position', element: null },
            '*',
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
