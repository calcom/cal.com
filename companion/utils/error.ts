/**
 * Determines if the error should be displayed to the user.
 * Filters out authentication errors (which are handled by auth redirect)
 * and only shows errors in development mode.
 *
 * @param queryError - The error from a query, if any
 * @param context - A description of what was being loaded (e.g., "event types", "bookings")
 * @returns A user-friendly error message or null if the error should not be displayed
 *
 * @example
 * ```tsx
 * const { error: queryError } = useEventTypes();
 * const error = getDisplayError(queryError, "event types");
 *
 * if (error) {
 *   return <ErrorView error={error} />;
 * }
 * ```
 */
export function getDisplayError(
  queryError: Error | null | undefined,
  context: string
): string | null {
  if (!queryError) return null;

  const isAuthError =
    queryError.message?.includes("Authentication") ||
    queryError.message?.includes("sign in") ||
    queryError.message?.includes("401");

  if (isAuthError) return null;

  return __DEV__ ? `Failed to load ${context}.` : null;
}
