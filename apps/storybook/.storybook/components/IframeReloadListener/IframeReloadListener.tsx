import { useEffect } from 'react';

/**
 * Listens for reload messages from the parent window and reloads the iframe.
 * Used when Storybook is embedded in an iframe to allow manual refresh.
 */
export function IframeReloadListener() {
  useEffect(() => {
    const handleReloadMessage = (e: MessageEvent) => {
      console.log('[Storybook] Received message:', e.data, 'from origin:', e.origin);
      if (e.data.type === 'reload') {
        console.log('[Storybook] Reloading iframe...');
        window.location.reload();
      }
    };

    window.addEventListener('message', handleReloadMessage);
    console.log('[Storybook] Reload message listener registered');

    return () => {
      window.removeEventListener('message', handleReloadMessage);
    };
  }, []);

  return null; // This component only adds event listeners
}
