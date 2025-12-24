/**
 * Contexts Index
 *
 * Central export point for all React contexts.
 *
 * @example
 * ```tsx
 * import { AuthProvider, useAuth, QueryProvider } from '../contexts';
 * ```
 */

// Auth context
export { AuthProvider, useAuth } from "./AuthContext";

// Query context
export { QueryProvider, useQueryContext } from "./QueryContext";
