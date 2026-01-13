/**
 * Contexts Index
 *
 * Central export point for all React contexts.
 *
 * @example
 * ```tsx
 * import { AuthProvider, useAuth, QueryProvider, ToastProvider, useGlobalToast } from '../contexts';
 * ```
 */

// Auth context
export { AuthProvider, useAuth } from "./AuthContext";

// Query context
export { QueryProvider, useQueryContext } from "./QueryContext";

// Toast context
export { ToastProvider, useGlobalToast, type ToastState, type ToastType } from "./ToastContext";
