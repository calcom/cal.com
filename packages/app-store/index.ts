/**
 * Cal.com App Store - Optimized for Performance
 *
 * This module provides lazy loading for Cal.com apps to improve development
 * performance. Instead of loading all 100+ apps upfront, apps are loaded
 * on-demand when actually needed.
 *
 * IMPLEMENTATION CHANGE: This replaces the previous monolithic app store with
 * a lazy loading system that reduces initial bundle size significantly.
 *
 * Backward compatibility is maintained via a compatibility proxy, though
 * new code should prefer the named utilities (loadApp, hasApp, etc.).
 */
import { lazyAppStore } from "./lazy-loader";

// Export the lazy app store as the default export
// This maintains backward compatibility with existing imports
export default lazyAppStore;

// Re-export utilities for direct usage
export { loadApp, hasApp, getAvailableApps, preloadApps, clearAppCache } from "./lazy-loader";
