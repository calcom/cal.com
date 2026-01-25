/**
 * Schedules (Availability) Query Hooks
 *
 * This module provides React Query hooks for fetching and mutating schedules.
 * It integrates with the existing CalComAPIService and provides:
 * - Automatic caching with configurable stale times
 * - Pull-to-refresh support via refetch
 * - Optimistic updates for mutations
 * - Cache invalidation on create/update/delete
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_CONFIG, queryKeys } from "@/config/cache.config";
import { CalComAPIService, type Schedule } from "@/services/calcom";

/**
 * Sort schedules: default first, then alphabetically by name
 */
function sortSchedules(schedules: Schedule[]): Schedule[] {
  return schedules.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Schedule creation input type
 */
export interface CreateScheduleInput {
  name: string;
  timeZone: string;
  isDefault?: boolean;
  availability?: Array<{
    days: string[];
    startTime: string;
    endTime: string;
  }>;
  overrides?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Schedule update input type
 */
export interface UpdateScheduleInput {
  isDefault?: boolean;
  name?: string;
  timeZone?: string;
  availability?: Array<{
    days: string[];
    startTime: string;
    endTime: string;
  }>;
  overrides?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Hook to fetch all schedules
 *
 * @returns Query result with schedules data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data: schedules, isLoading, refetch, isRefetching } = useSchedules();
 *
 * // Pull-to-refresh
 * <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
 * ```
 */
export function useSchedules() {
  return useQuery({
    queryKey: queryKeys.schedules.lists(),
    queryFn: async () => {
      const schedules = await CalComAPIService.getSchedules();
      return sortSchedules(schedules);
    },
    staleTime: CACHE_CONFIG.schedules.staleTime,
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
 * Hook to fetch a single schedule by ID
 *
 * @param id - The ID of the schedule
 * @returns Query result with schedule data
 *
 * @example
 * ```tsx
 * const { data: schedule, isLoading } = useScheduleById(123);
 * ```
 */
export function useScheduleById(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.schedules.detail(id || 0),
    queryFn: () => {
      if (!id) throw new Error("id is required");
      return CalComAPIService.getScheduleById(id);
    },
    enabled: !!id, // Only fetch when id is provided
    staleTime: CACHE_CONFIG.schedules.staleTime,
  });
}

/**
 * Hook to create a new schedule
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: createSchedule, isPending } = useCreateSchedule();
 *
 * createSchedule({
 *   name: 'Working Hours',
 *   timeZone: 'America/New_York',
 *   availability: [
 *     { days: ['Monday', 'Tuesday'], startTime: '09:00', endTime: '17:00' }
 *   ]
 * });
 * ```
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScheduleInput) => CalComAPIService.createSchedule(input),
    onSuccess: (newSchedule) => {
      // Invalidate the list to include the new schedule
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });

      // Optionally, add the new schedule to cache immediately
      queryClient.setQueryData(queryKeys.schedules.detail(newSchedule.id), newSchedule);
    },
    onError: (_error) => {
      console.error("Failed to create schedule");
    },
  });
}

/**
 * Hook to update a schedule with optimistic updates
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateSchedule, isPending } = useUpdateSchedule();
 *
 * updateSchedule({
 *   id: 123,
 *   updates: { name: 'Updated Schedule Name' }
 * });
 * ```
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateScheduleInput }) =>
      CalComAPIService.updateSchedule(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.schedules.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.schedules.lists() });

      // Snapshot the previous values for rollback
      const previousSchedule = queryClient.getQueryData<Schedule | null>(
        queryKeys.schedules.detail(id)
      );
      const previousSchedules = queryClient.getQueryData<Schedule[]>(queryKeys.schedules.lists());

      // Optimistically update the detail cache if it exists
      if (previousSchedule) {
        const optimisticSchedule: Schedule = {
          ...previousSchedule,
          ...updates,
          name: updates.name ?? previousSchedule.name,
          timeZone: updates.timeZone ?? previousSchedule.timeZone,
        };
        queryClient.setQueryData(queryKeys.schedules.detail(id), optimisticSchedule);
      }

      // Update the list cache optimistically (even if detail cache doesn't exist)
      if (previousSchedules) {
        const updatedList = previousSchedules.map((s) => {
          if (s.id === id) {
            // Merge updates into the existing schedule from the list
            return {
              ...s,
              ...updates,
              name: updates.name ?? s.name,
              timeZone: updates.timeZone ?? s.timeZone,
            };
          }
          return s;
        });
        queryClient.setQueryData(queryKeys.schedules.lists(), sortSchedules(updatedList));
      }

      return { previousSchedule, previousSchedules };
    },
    onSuccess: (updatedSchedule, variables) => {
      // Update the specific schedule in cache with server response
      queryClient.setQueryData(queryKeys.schedules.detail(variables.id), updatedSchedule);

      // Update the list cache with the server response
      const currentSchedules = queryClient.getQueryData<Schedule[]>(queryKeys.schedules.lists());
      if (currentSchedules) {
        const updatedList = currentSchedules.map((s) =>
          s.id === variables.id ? updatedSchedule : s
        );
        queryClient.setQueryData(queryKeys.schedules.lists(), sortSchedules(updatedList));
      } else {
        // If list cache doesn't exist, invalidate to trigger refetch when user navigates to list
        queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });
      }
    },
    onError: (_error, variables, context) => {
      // Rollback to previous values on error
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          queryKeys.schedules.detail(variables.id),
          context.previousSchedule
        );
      }
      if (context?.previousSchedules) {
        queryClient.setQueryData(queryKeys.schedules.lists(), context.previousSchedules);
      }
      console.error("Failed to update schedule");
    },
  });
}

/**
 * Hook to set a schedule as default
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: setAsDefault, isPending } = useSetScheduleAsDefault();
 *
 * setAsDefault(123);
 * ```
 */
export function useSetScheduleAsDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => CalComAPIService.updateSchedule(id, { isDefault: true }),
    onSuccess: () => {
      // Invalidate all schedules to update the default flag
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
    onError: (_error) => {
      console.error("Failed to set schedule as default");
    },
  });
}

/**
 * Hook to delete a schedule
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: deleteSchedule, isPending } = useDeleteSchedule();
 *
 * deleteSchedule(123);
 * ```
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => CalComAPIService.deleteSchedule(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.schedules.lists() });

      // Snapshot the previous value
      const previousSchedules = queryClient.getQueryData<Schedule[]>(queryKeys.schedules.lists());

      // Optimistically remove from the list
      if (previousSchedules) {
        queryClient.setQueryData(
          queryKeys.schedules.lists(),
          previousSchedules.filter((s) => s.id !== deletedId)
        );
      }

      return { previousSchedules };
    },
    onError: (_error, _deletedId, context) => {
      // Rollback on error
      if (context?.previousSchedules) {
        queryClient.setQueryData(queryKeys.schedules.lists(), context.previousSchedules);
      }
      console.error("Failed to delete schedule");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });
    },
  });
}

/**
 * Hook to duplicate a schedule
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: duplicateSchedule, isPending } = useDuplicateSchedule();
 *
 * duplicateSchedule(123);
 * ```
 */
export function useDuplicateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => CalComAPIService.duplicateSchedule(id),
    onSuccess: () => {
      // Invalidate the list to include the duplicated schedule
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });
    },
    onError: (_error) => {
      console.error("Failed to duplicate schedule");
    },
  });
}

/**
 * Hook to prefetch schedules (useful for navigation)
 *
 * @returns Function to prefetch schedules
 */
export function usePrefetchSchedules() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.schedules.lists(),
      queryFn: async () => {
        const schedules = await CalComAPIService.getSchedules();
        return sortSchedules(schedules);
      },
      staleTime: CACHE_CONFIG.schedules.staleTime,
    });
  };
}

/**
 * Hook to invalidate all schedules cache
 *
 * @returns Function to invalidate schedules cache
 */
export function useInvalidateSchedules() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
  };
}

/**
 * Type exports for consumers
 */
export type { Schedule };
