/**
 * User profile functions for Cal.com API
 */

import type { UserProfile } from "../types";

import { makeRequest } from "./request";

// Module-level state for user profile caching
let _userProfile: UserProfile | null = null;
// In-flight promise to prevent concurrent /me API calls
let _userProfilePromise: Promise<UserProfile> | null = null;

/**
 * Get current user profile from API
 */
export async function getCurrentUser(): Promise<UserProfile> {
  const response = await makeRequest<{ status: string; data: UserProfile }>(
    "/me",
    {
      headers: {
        "cal-api-version": "2024-06-11",
      },
    },
    "2024-06-11"
  );
  return response.data;
}

/**
 * Update current user profile
 */
export async function updateUserProfile(updates: {
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
}): Promise<UserProfile> {
  try {
    const response = await makeRequest<{ status: string; data: UserProfile }>(
      "/me",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(updates),
      },
      "2024-06-11"
    );

    if (response?.data) {
      // Update cached profile
      _userProfile = response.data;
      return response.data;
    }

    throw new Error("Invalid response from update user profile API");
  } catch (error) {
    console.error("updateUserProfile error");
    throw error;
  }
}

/**
 * Get and cache user profile with in-flight deduplication
 * This prevents multiple concurrent callers from each making a /me API call
 */
export async function getUserProfile(): Promise<UserProfile> {
  // Return cached profile if available
  if (_userProfile) {
    return _userProfile;
  }

  // If there's already an in-flight request, wait for it instead of making a new one
  if (_userProfilePromise) {
    return _userProfilePromise;
  }

  // Create a new request and cache the promise to deduplicate concurrent calls
  _userProfilePromise = getCurrentUser()
    .then((profile) => {
      _userProfile = profile;
      _userProfilePromise = null;
      return profile;
    })
    .catch((error) => {
      _userProfilePromise = null;
      throw error;
    });

  return _userProfilePromise;
}

/**
 * Clear cached profile (useful for logout)
 */
export function clearUserProfile(): void {
  _userProfile = null;
  _userProfilePromise = null;
}

/**
 * Helper to get username from user profile
 */
export async function getUsername(): Promise<string> {
  const profile = await getUserProfile();
  return profile.username;
}
