/**
 * Event Types Query Hooks
 *
 * This module provides React Query hooks for fetching and mutating event types.
 * It integrates with the existing CalComAPIService and provides:
 * - Automatic caching with configurable stale times
 * - Pull-to-refresh support via refetch
 * - Optimistic updates for mutations
 * - Cache invalidation on create/update/delete
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_CONFIG, queryKeys } from "@/config/cache.config";
import { CalComAPIService, type CreateEventTypeInput, type EventType } from "@/services/calcom";
import { requestRating, RatingTrigger } from "@/hooks/useAppStoreRating";

/**
 * Hook to fetch all event types
 *
 * @returns Query result with event types data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data: eventTypes, isLoading, refetch, isRefetching } = useEventTypes();
 *
 * // Pull-to-refresh
 * <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
 * ```
 */
export function useEventTypes() {
  return useQuery({
    queryKey: queryKeys.eventTypes.lists(),
    queryFn: () => CalComAPIService.getEventTypes(),
    staleTime: CACHE_CONFIG.eventTypes.staleTime,
    // Keep previous data while fetching new data (smoother UX)
    placeholderData: (previousData) => previousData,
    // Don't retry on network errors (keeps cache intact)
    retry: (failureCount, error) => {
      if (error?.message?.includes("Network") || error?.message?.includes("fetch")) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnReconnect: true,
  });
}

/**
 * Hook to fetch a single event type by ID
 *
 * @param id - The ID of the event type
 * @returns Query result with event type data
 *
 * @example
 * ```tsx
 * const { data: eventType, isLoading } = useEventTypeById(123);
 * ```
 */
export function useEventTypeById(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.eventTypes.detail(id || 0),
    queryFn: () => {
      if (!id) throw new Error("id is required");
      return CalComAPIService.getEventTypeById(id);
    },
    enabled: !!id, // Only fetch when id is provided
    staleTime: CACHE_CONFIG.eventTypes.staleTime,
  });
}

/**
 * Hook to create a new event type
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: createEventType, isPending } = useCreateEventType();
 *
 * createEventType({
 *   title: 'Quick Chat',
 *   slug: 'quick-chat',
 *   lengthInMinutes: 15,
 * });
 * ```
 */
export function useCreateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventTypeInput) => CalComAPIService.createEventType(input),
    onSuccess: (newEventType) => {
      // Invalidate the list to include the new event type
      queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.lists() });

      // Optionally, add the new event type to cache immediately
      queryClient.setQueryData(queryKeys.eventTypes.detail(newEventType.id), newEventType);

      // Request app store rating on first event type save
      requestRating(RatingTrigger.EVENT_TYPE_SAVED);
    },
    onError: (error) => {
      console.error("Failed to create event type");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[useCreateEventType] failed", { message, stack });
      }
    },
  });
}

/**
 * Hook to update an event type with optimistic updates
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateEventType, isPending } = useUpdateEventType();
 *
 * updateEventType({
 *   id: 123,
 *   updates: { title: 'Updated Title' }
 * });
 * ```
 */
export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Record<string, unknown> }) =>
      CalComAPIService.updateEventType(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.eventTypes.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.eventTypes.lists() });

      // Snapshot the previous values for rollback
      const previousEventType = queryClient.getQueryData<EventType | null>(
        queryKeys.eventTypes.detail(id)
      );
      const previousEventTypes = queryClient.getQueryData<EventType[]>(
        queryKeys.eventTypes.lists()
      );

      // Optimistically update the detail cache if it exists
      if (previousEventType) {
        const optimisticEventType: EventType = {
          ...previousEventType,
          ...updates,
        };
        queryClient.setQueryData(queryKeys.eventTypes.detail(id), optimisticEventType);
      }

      // Update the list cache optimistically (even if detail cache doesn't exist)
      if (previousEventTypes) {
        const updatedList = previousEventTypes.map((et) => {
          if (et.id === id) {
            return {
              ...et,
              ...updates,
            };
          }
          return et;
        });
        queryClient.setQueryData(queryKeys.eventTypes.lists(), updatedList);
      }

      return { previousEventType, previousEventTypes };
    },
    onSuccess: (updatedEventType, variables) => {
      // Update the specific event type in cache with server response
      queryClient.setQueryData(queryKeys.eventTypes.detail(variables.id), updatedEventType);

      // Update the list cache with the server response
      const currentEventTypes = queryClient.getQueryData<EventType[]>(queryKeys.eventTypes.lists());
      if (currentEventTypes) {
        const updatedList = currentEventTypes.map((et) =>
          et.id === variables.id ? updatedEventType : et
        );
        queryClient.setQueryData(queryKeys.eventTypes.lists(), updatedList);
      } else {
        // If list cache doesn't exist, invalidate to trigger refetch when user navigates to list
        queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.lists() });
      }

      // Request app store rating on first event type save
      requestRating(RatingTrigger.EVENT_TYPE_SAVED);
    },
    onError: (error, variables, context) => {
      // Rollback to previous values on error
      if (context?.previousEventType) {
        queryClient.setQueryData(
          queryKeys.eventTypes.detail(variables.id),
          context.previousEventType
        );
      }
      if (context?.previousEventTypes) {
        queryClient.setQueryData(queryKeys.eventTypes.lists(), context.previousEventTypes);
      }
      console.error("Failed to update event type");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[useUpdateEventType] failed", { message, stack });
      }
    },
  });
}

/**
 * Hook to delete an event type
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: deleteEventType, isPending } = useDeleteEventType();
 *
 * deleteEventType(123);
 * ```
 */
export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => CalComAPIService.deleteEventType(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventTypes.lists() });

      // Snapshot the previous value
      const previousEventTypes = queryClient.getQueryData<EventType[]>(
        queryKeys.eventTypes.lists()
      );

      // Optimistically remove from the list
      if (previousEventTypes) {
        queryClient.setQueryData(
          queryKeys.eventTypes.lists(),
          previousEventTypes.filter((et) => et.id !== deletedId)
        );
      }

      return { previousEventTypes };
    },
    onError: (error, _deletedId, context) => {
      // Rollback on error
      if (context?.previousEventTypes) {
        queryClient.setQueryData(queryKeys.eventTypes.lists(), context.previousEventTypes);
      }
      console.error("Failed to delete event type");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[useDeleteEventType] failed", { message, stack });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.lists() });
    },
  });
}

/**
 * Hook to duplicate an event type
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: duplicateEventType, isPending } = useDuplicateEventType();
 *
 * duplicateEventType({
 *   eventType: existingEventType,
 *   existingEventTypes: allEventTypes
 * });
 * ```
 */
export function useDuplicateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventType,
      existingEventTypes,
    }: {
      eventType: EventType;
      existingEventTypes: EventType[];
    }) => {
      // Generate a new title and slug for the duplicate
      const newTitle = `${eventType.title} (copy)`;
      let newSlug = `${eventType.slug}-copy`;

      // Check if slug already exists and append a number if needed
      let counter = 1;
      while (existingEventTypes.some((et) => et.slug === newSlug)) {
        newSlug = `${eventType.slug}-copy-${counter}`;
        counter++;
      }

      const duration = eventType.lengthInMinutes ?? eventType.length ?? 15;

      return CalComAPIService.createEventType({
        title: newTitle,
        slug: newSlug,
        lengthInMinutes: duration,
        description: eventType.description || undefined,
      });
    },
    onSuccess: () => {
      // Invalidate the list to include the duplicated event type
      queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.lists() });
    },
    onError: (error) => {
      console.error("Failed to duplicate event type");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[useDuplicateEventType] failed", { message, stack });
      }
    },
  });
}

/**
 * Hook to prefetch event types (useful for navigation)
 *
 * @returns Function to prefetch event types
 */
export function usePrefetchEventTypes() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventTypes.lists(),
      queryFn: () => CalComAPIService.getEventTypes(),
      staleTime: CACHE_CONFIG.eventTypes.staleTime,
    });
  };
}

/**
 * Hook to invalidate all event types cache
 *
 * @returns Function to invalidate event types cache
 */
export function useInvalidateEventTypes() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes.all });
  };
}

/**
 * Type exports for consumers
 */
export type { EventType, CreateEventTypeInput };
