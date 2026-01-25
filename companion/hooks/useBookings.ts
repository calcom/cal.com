/**
 * Bookings Query Hooks
 *
 * This module provides React Query hooks for fetching and mutating bookings data.
 * It integrates with the existing CalComAPIService and provides:
 * - Automatic caching with configurable stale times
 * - Pull-to-refresh support via refetch
 * - Optimistic updates for mutations
 * - Cache invalidation on mutations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_CONFIG, queryKeys } from "@/config/cache.config";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { requestRating, RatingTrigger } from "@/hooks/useAppStoreRating";

/**
 * Filter options for fetching bookings
 */
export interface BookingFilters {
  status?: string[];
  fromDate?: string;
  toDate?: string;
  eventTypeId?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

/**
 * Hook to fetch bookings with optional filters
 *
 * @param filters - Optional filters for the bookings query
 * @returns Query result with bookings data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data: bookings, isLoading, refetch } = useBookings({ status: ['upcoming'] });
 *
 * // Pull-to-refresh
 * <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
 * ```
 */
export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: queryKeys.bookings.list(filters || {}),
    queryFn: () => CalComAPIService.getBookings(filters),
    staleTime: CACHE_CONFIG.bookings.staleTime,
    // Keep previous data while fetching new data (smoother UX)
    placeholderData: (previousData) => previousData,
    // Don't retry on network errors (keeps cache intact)
    retry: (failureCount, error) => {
      // Don't retry network errors - keeps cached data visible
      if (error?.message?.includes("Network") || error?.message?.includes("fetch")) {
        return false;
      }
      return failureCount < 2;
    },
    // Keep showing cached data even if refetch fails
    refetchOnReconnect: true,
  });
}

/**
 * Hook to fetch a single booking by UID
 *
 * @param uid - The unique identifier of the booking
 * @returns Query result with booking data
 *
 * @example
 * ```tsx
 * const { data: booking, isLoading } = useBookingByUid('abc-123');
 * ```
 */
export function useBookingByUid(uid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(uid || ""),
    queryFn: () => {
      if (!uid) throw new Error("uid is required");
      return CalComAPIService.getBookingByUid(uid);
    },
    enabled: !!uid, // Only fetch when uid is provided
    staleTime: CACHE_CONFIG.bookings.staleTime,
  });
}

/**
 * Hook to cancel a booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: cancelBooking, isPending } = useCancelBooking();
 *
 * cancelBooking({ uid: 'abc-123', reason: 'No longer needed' });
 * ```
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason?: string }) =>
      CalComAPIService.cancelBooking(uid, reason),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });
    },
    onError: (_error) => {
      console.error("Failed to cancel booking");
    },
  });
}

/**
 * Hook to mark an attendee as no-show (absent)
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: markNoShow, isPending } = useMarkNoShow();
 *
 * markNoShow({ uid: 'abc-123', attendeeEmail: 'attendee@example.com', absent: true });
 * ```
 */
export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      attendeeEmail,
      absent,
    }: {
      uid: string;
      attendeeEmail: string;
      absent: boolean;
    }) => CalComAPIService.markAbsent(uid, attendeeEmail, absent),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });
    },
    onError: (_error) => {
      console.error("Failed to mark attendee as no-show");
    },
  });
}

/**
 * Hook to reschedule a booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: rescheduleBooking, isPending } = useRescheduleBooking();
 *
 * rescheduleBooking({
 *   uid: 'abc-123',
 *   start: '2024-01-15T10:00:00Z',
 *   reschedulingReason: 'Conflict with another meeting'
 * });
 * ```
 */
export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      start,
      reschedulingReason,
    }: {
      uid: string;
      start: string;
      reschedulingReason?: string;
    }) => CalComAPIService.rescheduleBooking(uid, { start, reschedulingReason }),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });
    },
    onError: (_error) => {
      console.error("Failed to reschedule booking");
    },
  });
}

/**
 * Hook to confirm a pending booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: confirmBooking, isPending } = useConfirmBooking();
 *
 * confirmBooking({ uid: 'abc-123' });
 * ```
 */
export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid }: { uid: string }) => CalComAPIService.confirmBooking(uid),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });

      // Request app store rating on first booking confirmation
      requestRating(RatingTrigger.BOOKING_CONFIRMED);
    },
    onError: (_error) => {
      console.error("Failed to confirm booking");
    },
  });
}

/**
 * Hook to decline a pending booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: declineBooking, isPending } = useDeclineBooking();
 *
 * declineBooking({ uid: 'abc-123', reason: 'Schedule conflict' });
 * ```
 */
export function useDeclineBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason?: string }) =>
      CalComAPIService.declineBooking(uid, reason),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });

      // Request app store rating on first booking rejection
      requestRating(RatingTrigger.BOOKING_REJECTED);
    },
    onError: (_error) => {
      console.error("Failed to decline booking");
    },
  });
}

/**
 * Hook to update the location of a booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateLocation, isPending } = useUpdateLocation();
 *
 * updateLocation({
 *   uid: 'abc-123',
 *   location: { type: 'link', link: 'https://meet.example.com' }
 * });
 * ```
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      location,
    }: {
      uid: string;
      location: { type: string; [key: string]: string };
    }) => CalComAPIService.updateLocationV2(uid, location),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });
    },
    onError: (_error) => {
      console.error("Failed to update location");
    },
  });
}

/**
 * Hook to add guests to a booking
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: addGuests, isPending } = useAddGuests();
 *
 * addGuests({
 *   uid: 'abc-123',
 *   guests: [{ email: 'guest@example.com', name: 'Guest Name' }]
 * });
 * ```
 */
export function useAddGuests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, guests }: { uid: string; guests: { email: string; name?: string }[] }) =>
      CalComAPIService.addGuests(uid, guests),
    onSuccess: (_, variables) => {
      // Invalidate all booking queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(variables.uid),
      });
    },
    onError: (_error) => {
      console.error("Failed to add guests");
    },
  });
}

/**
 * Hook to prefetch bookings (useful for navigation)
 *
 * @returns Function to prefetch bookings
 *
 * @example
 * ```tsx
 * const prefetchBookings = usePrefetchBookings();
 *
 * // Prefetch when user hovers over bookings tab
 * onHover={() => prefetchBookings({ status: ['upcoming'] })}
 * ```
 */
export function usePrefetchBookings() {
  const queryClient = useQueryClient();

  return (filters?: BookingFilters) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.bookings.list(filters || {}),
      queryFn: () => CalComAPIService.getBookings(filters),
      staleTime: CACHE_CONFIG.bookings.staleTime,
    });
  };
}

/**
 * Hook to invalidate all bookings cache
 * Useful when you know data has changed externally
 *
 * @returns Function to invalidate bookings cache
 */
export function useInvalidateBookings() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
  };
}

/**
 * Type exports for consumers
 */
export type { Booking };
