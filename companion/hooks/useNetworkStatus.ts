/**
 * useNetworkStatus Hook
 *
 * This hook provides real-time network status for components.
 * Used to disable mutations when offline.
 */
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

interface NetworkStatus {
  isOnline: boolean;
  isLoading: boolean;
}

/**
 * Hook to monitor network connectivity status.
 * Returns whether the device is online and if the status is still loading.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
      setIsLoading(false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, isLoading };
}
