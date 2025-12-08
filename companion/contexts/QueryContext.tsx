/**
 * React Query Context Provider
 *
 * This module sets up React Query with:
 * - Optimized default configurations
 * - Offline persistence support
 * - Environment-based cache duration settings
 * - Cross-platform compatibility (mobile + extension)
 */

import React, { ReactNode, useState, useEffect, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { CACHE_CONFIG } from "../config/cache.config";
import { createQueryPersister, clearQueryCache } from "../utils/queryPersister";

/**
 * Create and configure the QueryClient instance
 */
const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // How long data is considered fresh
        staleTime: CACHE_CONFIG.defaultStaleTime,

        // How long to keep unused data in cache
        gcTime: CACHE_CONFIG.gcTime,

        // Refetch behavior
        refetchOnWindowFocus: CACHE_CONFIG.refetch.onWindowFocus,
        refetchOnReconnect: CACHE_CONFIG.refetch.onReconnect,
        refetchOnMount: CACHE_CONFIG.refetch.onMount,

        // Retry configuration
        retry: CACHE_CONFIG.retry.count,
        retryDelay: CACHE_CONFIG.retry.delay,

        // Network mode - always try to fetch, use cache as fallback
        networkMode: "offlineFirst",
      },
      mutations: {
        // Retry failed mutations
        retry: 1,
        retryDelay: 1000,

        // Network mode for mutations
        networkMode: "offlineFirst",
      },
    },
  });
};

/**
 * Props for the QueryProvider component
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Context for exposing query utilities
 */
interface QueryContextValue {
  /** Invalidate all queries and refetch */
  invalidateAllQueries: () => Promise<void>;
  /** Clear the persisted cache */
  clearCache: () => Promise<void>;
  /** Check if the app is online */
  isOnline: boolean;
}

const QueryContext = React.createContext<QueryContextValue | undefined>(undefined);

/**
 * QueryProvider component that wraps the app with React Query functionality
 *
 * Features:
 * - Automatic cache persistence to device storage
 * - Online/offline detection
 * - Configurable cache durations via environment variables
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance (stable reference)
  const [queryClient] = useState(() => createQueryClient());

  // Create persister instance (stable reference)
  const [persister] = useState(() => createQueryPersister());

  // Track online status
  const [isOnline, setIsOnline] = useState(true);

  // Setup online/offline detection
  useEffect(() => {
    // For web/extension
    if (Platform.OS === "web") {
      const handleOnline = () => {
        setIsOnline(true);
        onlineManager.setOnline(true);
      };
      const handleOffline = () => {
        setIsOnline(false);
        onlineManager.setOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Set initial state
      setIsOnline(navigator.onLine);
      onlineManager.setOnline(navigator.onLine);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // For React Native, we could use NetInfo but it requires additional setup
    // For now, assume online on mobile (React Query handles network errors gracefully)
    return undefined;
  }, []);

  // Listen for reload messages from extension
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "cal-companion-reload-cache") {
          queryClient.invalidateQueries();
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
    return undefined;
  }, [queryClient]);

  /**
   * Invalidate all queries and trigger refetch
   */
  const invalidateAllQueries = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  /**
   * Clear the persisted cache
   */
  const clearCache = useCallback(async () => {
    queryClient.clear();
    await clearQueryCache();
  }, [queryClient]);

  const contextValue: QueryContextValue = useMemo(
    () => ({
      invalidateAllQueries,
      clearCache,
      isOnline,
    }),
    [invalidateAllQueries, clearCache, isOnline]
  );

  return (
    <QueryContext.Provider value={contextValue}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: CACHE_CONFIG.persistence.maxAge,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist successful queries
              return query.state.status === "success";
            },
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </QueryContext.Provider>
  );
}

/**
 * Hook to access query utilities
 */
export function useQueryContext(): QueryContextValue {
  const context = React.useContext(QueryContext);
  if (context === undefined) {
    throw new Error("useQueryContext must be used within a QueryProvider");
  }
  return context;
}

/**
 * Export for direct QueryClient access when needed
 * (e.g., for prefetching outside of components)
 */
export { QueryClient };
