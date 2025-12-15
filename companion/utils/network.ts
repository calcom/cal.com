/**
 * Network Utilities
 *
 * Helper functions for network-aware operations.
 */

import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

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
