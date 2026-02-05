/**
 * Event type functions for Cal.com API
 */

import { safeLogError } from "@/utils/safeLogger";

import type { CreateEventTypeInput, EventType } from "../types";

import { makeRequest } from "./request";
import { sanitizePayload } from "./utils";

/**
 * Get all event types for the authenticated user
 */
export async function getEventTypes(): Promise<EventType[]> {
  // For authenticated users, no username/orgSlug params needed - API uses auth token
  // This also ensures hidden event types are returned (they're filtered out when username is provided)
  // Sort by creation date descending (newer first) to match main codebase behavior
  const endpoint = `/event-types?sortCreatedAt=desc`;

  const response = await makeRequest<unknown>(endpoint, {}, "2024-06-14");

  // Handle different possible response structures
  let eventTypesArray: EventType[] = [];

  if (Array.isArray(response)) {
    eventTypesArray = response as EventType[];
  } else if (response && typeof response === "object") {
    const resp = response as Record<string, unknown>;
    if (resp.data && Array.isArray(resp.data)) {
      eventTypesArray = resp.data as EventType[];
    } else if (resp.eventTypes && Array.isArray(resp.eventTypes)) {
      eventTypesArray = resp.eventTypes as EventType[];
    } else if (resp.items && Array.isArray(resp.items)) {
      eventTypesArray = resp.items as EventType[];
    } else if (resp.data && typeof resp.data === "object") {
      const dataObj = resp.data as Record<string, unknown>;
      if (dataObj.eventTypes && Array.isArray(dataObj.eventTypes)) {
        eventTypesArray = dataObj.eventTypes as EventType[];
      } else if (dataObj.items && Array.isArray(dataObj.items)) {
        eventTypesArray = dataObj.items as EventType[];
      } else {
        const keys = Object.keys(dataObj);
        if (keys.length > 0) {
          eventTypesArray = Object.values(dataObj).filter((item): item is EventType =>
            Boolean(item && typeof item === "object" && "id" in item)
          );
        }
      }
    } else {
      const possibleArrays = Object.values(resp).filter((val) => Array.isArray(val));
      if (possibleArrays.length > 0) {
        eventTypesArray = possibleArrays[0] as EventType[];
      }
    }
  }

  return eventTypesArray;
}

/**
 * Get a single event type by ID
 */
export async function getEventTypeById(eventTypeId: number): Promise<EventType | null> {
  try {
    const response = await makeRequest<{ status: string; data: EventType }>(
      `/event-types/${eventTypeId}`,
      {},
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    // Handle 404 errors gracefully - resource doesn't exist or user doesn't have access
    if (error instanceof Error) {
      // Check if error message contains 404 status code
      const statusMatch = error.message.match(/API Error: (\d+)/);
      if (statusMatch && statusMatch[1] === "404") {
        console.warn(`Event type ${eventTypeId} not found`);
        return null;
      }
    }
    console.error("getEventTypeById error");
    throw error;
  }
}

/**
 * Create a new event type
 */
export async function createEventType(input: CreateEventTypeInput): Promise<EventType> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: EventType }>(
      "/event-types",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-14",
        },
        body: JSON.stringify(sanitizedInput),
      },
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create event type API");
  } catch (error) {
    console.error("createEventType error");
    throw error;
  }
}

/**
 * Update an event type
 */
export async function updateEventType(
  eventTypeId: number,
  updates: Partial<CreateEventTypeInput>
): Promise<EventType> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);

    const response = await makeRequest<{ status: string; data: EventType }>(
      `/event-types/${eventTypeId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "cal-api-version": "2024-06-14",
        },
        body: JSON.stringify(sanitizedUpdates),
      },
      "2024-06-14"
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update event type API");
  } catch (error) {
    console.error("updateEventType error");
    throw error;
  }
}

/**
 * Delete an event type
 */
export async function deleteEventType(eventTypeId: number): Promise<void> {
  try {
    await makeRequest(
      `/event-types/${eventTypeId}`,
      {
        method: "DELETE",
      },
      "2024-06-14"
    );
  } catch (error) {
    safeLogError("Delete API error", { error, eventTypeId });
    throw error;
  }
}
