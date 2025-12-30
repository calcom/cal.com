/**
 * Cache Configuration for Cal.com Companion App
 *
 * This module provides centralized cache configuration with environment variable support.
 * All cache durations are configurable via EXPO_PUBLIC_ prefixed environment variables.
 */

// Helper to parse environment variable to number with fallback
const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

// Convert minutes to milliseconds
// -1 means "never stale" (Infinity)
const minutesToMs = (minutes: number): number => {
  if (minutes < 0) return Infinity;
  return minutes * 60 * 1000;
};

/**
 * Default cache durations in minutes
 * Use -1 to indicate "never stale" (Infinity) - data only refreshes on manual reload or mutations
 */
const DEFAULT_STALE_TIME_MINUTES = 5;
const DEFAULT_BOOKINGS_STALE_TIME_MINUTES = 5;
const DEFAULT_EVENT_TYPES_STALE_TIME_MINUTES = -1; // Never stale - only refresh on mutations
const DEFAULT_SCHEDULES_STALE_TIME_MINUTES = -1; // Never stale - only refresh on mutations
const DEFAULT_USER_PROFILE_STALE_TIME_MINUTES = -1; // Never stale - only refresh on manual reload
const DEFAULT_GC_TIME_MINUTES = 1440; // Keep cached data for 24 hours (full day offline support)

/**
 * Cache configuration object with all settings
 */
export const CACHE_CONFIG = {
  /**
   * Default stale time for all queries (in milliseconds)
   * Data older than this is considered stale and will be refetched in background
   */
  defaultStaleTime: minutesToMs(
    getEnvNumber("EXPO_PUBLIC_CACHE_STALE_TIME_MINUTES", DEFAULT_STALE_TIME_MINUTES)
  ),

  /**
   * Garbage collection time (in milliseconds)
   * Unused cache entries are removed after this duration
   */
  gcTime: minutesToMs(getEnvNumber("EXPO_PUBLIC_CACHE_GC_TIME_MINUTES", DEFAULT_GC_TIME_MINUTES)),

  /**
   * Resource-specific cache configurations
   *
   * Stale time determines when data is considered "stale" and should be refetched:
   * - Bookings: 5 min - moderate refresh rate since bookings can change externally
   * - Event Types: Infinity - only refresh on mutations (create/update/delete) or manual pull-to-refresh
   * - Schedules: Infinity - only refresh on mutations (create/update/delete) or manual pull-to-refresh
   * - User Profile: Infinity - only refresh on manual pull-to-refresh (rarely changes)
   */
  bookings: {
    staleTime: minutesToMs(
      getEnvNumber(
        "EXPO_PUBLIC_BOOKINGS_CACHE_STALE_TIME_MINUTES",
        DEFAULT_BOOKINGS_STALE_TIME_MINUTES
      )
    ),
  },

  eventTypes: {
    /** Infinity = never stale, only refreshes on mutations or manual reload */
    staleTime: minutesToMs(
      getEnvNumber(
        "EXPO_PUBLIC_EVENT_TYPES_CACHE_STALE_TIME_MINUTES",
        DEFAULT_EVENT_TYPES_STALE_TIME_MINUTES
      )
    ),
  },

  schedules: {
    /** Infinity = never stale, only refreshes on mutations or manual reload */
    staleTime: minutesToMs(
      getEnvNumber(
        "EXPO_PUBLIC_SCHEDULES_CACHE_STALE_TIME_MINUTES",
        DEFAULT_SCHEDULES_STALE_TIME_MINUTES
      )
    ),
  },

  userProfile: {
    /** Infinity = never stale, only refreshes on manual reload */
    staleTime: minutesToMs(
      getEnvNumber(
        "EXPO_PUBLIC_USER_PROFILE_CACHE_STALE_TIME_MINUTES",
        DEFAULT_USER_PROFILE_STALE_TIME_MINUTES
      )
    ),
  },

  /**
   * Refetch behavior configuration
   */
  refetch: {
    onWindowFocus: true,
    onReconnect: true,
    onMount: false,
  },

  /**
   * Retry configuration for failed queries
   */
  retry: {
    count: 3,
    delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },

  /**
   * Persistence configuration
   */
  persistence: {
    /** Key prefix for persisted cache in storage */
    storageKey: "cal-companion-query-cache",
    /** Maximum age of persisted cache before it's discarded (24 hours) */
    maxAge: 24 * 60 * 60 * 1000,
    /** Throttle time for persisting cache to storage (1 second) */
    throttleTime: 1000,
  },
} as const;

/**
 * Query key factory for consistent cache key generation
 * Using array-based keys enables granular cache invalidation
 */
export const queryKeys = {
  // Bookings
  bookings: {
    all: ["bookings"] as const,
    lists: () => [...queryKeys.bookings.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, "detail"] as const,
    detail: (uid: string) => [...queryKeys.bookings.details(), uid] as const,
  },

  // Event Types
  eventTypes: {
    all: ["eventTypes"] as const,
    lists: () => [...queryKeys.eventTypes.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? ([...queryKeys.eventTypes.lists(), filters] as const)
        : queryKeys.eventTypes.lists(),
    details: () => [...queryKeys.eventTypes.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.eventTypes.details(), id] as const,
  },

  // Schedules (Availability)
  schedules: {
    all: ["schedules"] as const,
    lists: () => [...queryKeys.schedules.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? ([...queryKeys.schedules.lists(), filters] as const) : queryKeys.schedules.lists(),
    details: () => [...queryKeys.schedules.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.schedules.details(), id] as const,
  },

  // User Profile
  userProfile: {
    all: ["userProfile"] as const,
    current: () => [...queryKeys.userProfile.all, "current"] as const,
  },

  // Conferencing
  conferencing: {
    all: ["conferencing"] as const,
    options: () => [...queryKeys.conferencing.all, "options"] as const,
  },

  // Webhooks
  webhooks: {
    all: ["webhooks"] as const,
    global: () => [...queryKeys.webhooks.all, "global"] as const,
    eventType: (eventTypeId: number) =>
      [...queryKeys.webhooks.all, "eventType", eventTypeId] as const,
  },

  // Private Links
  privateLinks: {
    all: ["privateLinks"] as const,
    eventType: (eventTypeId: number) => [...queryKeys.privateLinks.all, eventTypeId] as const,
  },
} as const;

/**
 * Type exports for query keys
 */
export type QueryKeys = typeof queryKeys;
export type BookingQueryKeys = typeof queryKeys.bookings;
export type EventTypeQueryKeys = typeof queryKeys.eventTypes;
export type ScheduleQueryKeys = typeof queryKeys.schedules;
export type UserProfileQueryKeys = typeof queryKeys.userProfile;
