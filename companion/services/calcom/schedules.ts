/**
 * Schedule functions for Cal.com API
 */

import type { Schedule } from "../types";

import { makeRequest } from "./request";
import { sanitizePayload } from "./utils";

/**
 * Get all schedules for the authenticated user
 */
export async function getSchedules(): Promise<Schedule[]> {
  const response = await makeRequest<{ status: string; data: Schedule[] }>(
    "/schedules",
    {
      headers: {
        "cal-api-version": "2024-06-11",
      },
    },
    "2024-06-11"
  );

  let schedulesArray: Schedule[] = [];

  // Handle response structure: { status: "success", data: [...] }
  if (response && response.status === "success" && response.data && Array.isArray(response.data)) {
    schedulesArray = response.data;
  } else if (Array.isArray(response)) {
    // Fallback: response might be array directly
    schedulesArray = response;
  } else if (response?.data && Array.isArray(response.data)) {
    // Fallback: response.data might be array
    schedulesArray = response.data;
  }

  return schedulesArray;
}

/**
 * Get a schedule by ID
 */
export async function getScheduleById(scheduleId: number): Promise<Schedule | null> {
  try {
    const response = await makeRequest<unknown>(
      `/schedules/${scheduleId}`,
      {
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );

    if (response && typeof response === "object") {
      const resp = response as Record<string, unknown>;
      if (resp.data && typeof resp.data === "object") {
        return resp.data as Schedule;
      }
      if (resp.id) {
        return response as Schedule;
      }
    }

    return null;
  } catch (error) {
    console.error("getScheduleById error");
    throw error;
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(input: {
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
}): Promise<Schedule> {
  try {
    const sanitizedInput = sanitizePayload(input as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: Schedule }>(
      "/schedules",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(sanitizedInput),
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create schedule API");
  } catch (error) {
    console.error("createSchedule error");
    throw error;
  }
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: number,
  updates: {
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
): Promise<Schedule> {
  try {
    // Sanitize the updates to remove null values
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Schedule }>(
      `/schedules/${scheduleId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-11",
        },
        body: JSON.stringify(sanitizedUpdates),
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update schedule API");
  } catch (error) {
    console.error("updateSchedule error");
    throw error;
  }
}

/**
 * Duplicate a schedule
 */
export async function duplicateSchedule(scheduleId: number): Promise<Schedule> {
  try {
    const response = await makeRequest<{ status: string; data: Schedule }>(
      `/atoms/schedules/${scheduleId}/duplicate`,
      {
        method: "POST",
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from duplicate schedule API");
  } catch (error) {
    console.error("duplicateSchedule error");
    throw error;
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
  try {
    await makeRequest<{ status: string }>(
      `/schedules/${scheduleId}`,
      {
        method: "DELETE",
        headers: {
          "cal-api-version": "2024-06-11",
        },
      },
      "2024-06-11"
    );
  } catch (error) {
    console.error("deleteSchedule error");
    throw error;
  }
}
