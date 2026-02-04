/**
 * Private links functions for Cal.com API
 */

import type { CreatePrivateLinkInput, PrivateLink, UpdatePrivateLinkInput } from "../types";

import { makeRequest } from "./request";
import { sanitizePayload } from "./utils";

/**
 * Get all private links for an event type
 */
export async function getEventTypePrivateLinks(eventTypeId: number): Promise<PrivateLink[]> {
  try {
    const response = await makeRequest<{ status: string; data: PrivateLink[] }>(
      `/event-types/${eventTypeId}/private-links`
    );

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getEventTypePrivateLinks error");
    throw error;
  }
}

/**
 * Create a private link for an event type
 */
export async function createEventTypePrivateLink(
  eventTypeId: number,
  input: CreatePrivateLinkInput = {}
): Promise<PrivateLink> {
  try {
    const sanitizedInput = sanitizePayload(input as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: PrivateLink }>(
      `/event-types/${eventTypeId}/private-links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedInput),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create private link API");
  } catch (error) {
    console.error("createEventTypePrivateLink error");
    throw error;
  }
}

/**
 * Update a private link
 */
export async function updateEventTypePrivateLink(
  eventTypeId: number,
  linkId: number,
  updates: UpdatePrivateLinkInput
): Promise<PrivateLink> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: PrivateLink }>(
      `/event-types/${eventTypeId}/private-links/${linkId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedUpdates),
      }
    );

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from update private link API");
  } catch (error) {
    console.error("updateEventTypePrivateLink error");
    throw error;
  }
}

/**
 * Delete a private link
 */
export async function deleteEventTypePrivateLink(
  eventTypeId: number,
  linkId: number
): Promise<void> {
  try {
    await makeRequest(`/event-types/${eventTypeId}/private-links/${linkId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteEventTypePrivateLink error");
    throw error;
  }
}
