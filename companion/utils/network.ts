/**
 * Network Utilities
 *
 * Helper functions for network-aware operations.
 */

import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";

/**
 * Default timeout for fetch requests in milliseconds (30 seconds)
 */
const DEFAULT_FETCH_TIMEOUT = 30000;

/**
 * Fetch with timeout using AbortSignal.
 * This prevents requests from hanging indefinitely.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (RequestInit)
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise<Response>
 * @throws Error if the request times out or fails
 *
 * @example
 * ```tsx
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * ```
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Check if the device is currently online
 *
 * @returns Promise<boolean> - true if online, false if offline
 */
export const isOnline = async (): Promise<boolean> => {
  const netState = await NetInfo.fetch();
  return netState.isConnected === true && netState.isInternetReachable !== false;
};

/**
 * Execute a refresh function only if online.
 * Shows a friendly alert if offline and preserves cached data.
 *
 * @param refetchFn - The refetch function to call (e.g., from React Query)
 * @returns Promise<void>
 *
 * @example
 * ```tsx
 * const { refetch } = useBookings();
 *
 * const onRefresh = () => offlineAwareRefresh(refetch);
 *
 * <RefreshControl onRefresh={onRefresh} />
 * ```
 */
export const offlineAwareRefresh = async (refetchFn: () => Promise<unknown>): Promise<void> => {
  const online = await isOnline();

  if (!online) {
    Alert.alert("You're offline", "Can't refresh right now. Showing cached data.", [
      { text: "OK" },
    ]);
    return;
  }

  await refetchFn();
};
