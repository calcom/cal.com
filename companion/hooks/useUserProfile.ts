/**
 * User Profile Query Hooks
 *
 * This module provides React Query hooks for fetching and updating user profile.
 * It integrates with the existing CalComAPIService and provides:
 * - Automatic caching with configurable stale times
 * - Profile update mutations with cache invalidation
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_CONFIG, queryKeys } from "@/config/cache.config";
import { CalComAPIService, type UserProfile } from "@/services/calcom";

/**
 * User profile update input type
 */
export interface UpdateUserProfileInput {
  email?: string;
  name?: string;
  timeFormat?: number;
  defaultScheduleId?: number;
  weekStart?: string;
  timeZone?: string;
  locale?: string;
  avatarUrl?: string;
  bio?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to fetch the current user profile
 *
 * @returns Query result with user profile data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useUserProfile();
 *
 * if (profile) {
 *   console.log(profile.username, profile.email);
 * }
 * ```
 */
export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.userProfile.current(),
    queryFn: () => CalComAPIService.getUserProfile(),
    staleTime: CACHE_CONFIG.userProfile.staleTime,
    // Keep previous data while fetching new data (smoother UX)
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to get the current username
 *
 * @returns Query result with username
 *
 * @example
 * ```tsx
 * const { data: username } = useUsername();
 * ```
 */
export function useUsername() {
  const { data: profile, ...rest } = useUserProfile();

  return {
    ...rest,
    data: profile?.username,
  };
}

/**
 * Hook to update the user profile
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateProfile, isPending } = useUpdateUserProfile();
 *
 * updateProfile({
 *   name: 'New Name',
 *   timeZone: 'America/New_York'
 * });
 * ```
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateUserProfileInput) => CalComAPIService.updateUserProfile(updates),
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userProfile.current() });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(
        queryKeys.userProfile.current()
      );

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData(queryKeys.userProfile.current(), {
          ...previousProfile,
          ...newData,
        });
      }

      return { previousProfile };
    },
    onError: (error, _newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.userProfile.current(), context.previousProfile);
      }
      console.error("Failed to update user profile");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[useUpdateUserProfile] failed", { message, stack });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile.current() });
    },
  });
}

/**
 * Hook to prefetch user profile (useful for app initialization)
 *
 * @returns Function to prefetch user profile
 */
export function usePrefetchUserProfile() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.userProfile.current(),
      queryFn: () => CalComAPIService.getUserProfile(),
      staleTime: CACHE_CONFIG.userProfile.staleTime,
    });
  };
}

/**
 * Hook to invalidate user profile cache
 *
 * @returns Function to invalidate user profile cache
 */
export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userProfile.all });
  };
}

/**
 * Type exports for consumers
 */
export type { UserProfile };
