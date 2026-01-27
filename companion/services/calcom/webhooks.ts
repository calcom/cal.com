/**
 * Webhook functions for Cal.com API
 */

import type { CreateWebhookInput, UpdateWebhookInput, Webhook } from "../types";

import { makeRequest } from "./request";
import { sanitizePayload } from "./utils";

/**
 * Get all global webhooks
 */
export async function getWebhooks(): Promise<Webhook[]> {
  try {
    const response = await makeRequest<{ status: string; data: Webhook[] }>("/webhooks");

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getWebhooks error");
    throw error;
  }
}

/**
 * Create a global webhook
 */
export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>("/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedInput),
    });

    if (response?.data) {
      return response.data;
    }

    throw new Error("Invalid response from create webhook API");
  } catch (error) {
    console.error("createWebhook error");
    throw error;
  }
}

/**
 * Update a global webhook
 */
export async function updateWebhook(
  webhookId: string,
  updates: UpdateWebhookInput
): Promise<Webhook> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/webhooks/${webhookId}`,
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

    throw new Error("Invalid response from update webhook API");
  } catch (error) {
    console.error("updateWebhook error");
    throw error;
  }
}

/**
 * Delete a global webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  try {
    await makeRequest(`/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteWebhook error");
    throw error;
  }
}

/**
 * Get webhooks for a specific event type
 */
export async function getEventTypeWebhooks(eventTypeId: number): Promise<Webhook[]> {
  try {
    const response = await makeRequest<{ status: string; data: Webhook[] }>(
      `/event-types/${eventTypeId}/webhooks`
    );

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getEventTypeWebhooks error");
    throw error;
  }
}

/**
 * Create a webhook for a specific event type
 */
export async function createEventTypeWebhook(
  eventTypeId: number,
  input: CreateWebhookInput
): Promise<Webhook> {
  try {
    const sanitizedInput = sanitizePayload(input as unknown as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/event-types/${eventTypeId}/webhooks`,
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

    throw new Error("Invalid response from create event type webhook API");
  } catch (error) {
    console.error("createEventTypeWebhook error");
    throw error;
  }
}

/**
 * Update an event type webhook
 */
export async function updateEventTypeWebhook(
  eventTypeId: number,
  webhookId: string,
  updates: UpdateWebhookInput
): Promise<Webhook> {
  try {
    const sanitizedUpdates = sanitizePayload(updates as Record<string, unknown>);
    const response = await makeRequest<{ status: string; data: Webhook }>(
      `/event-types/${eventTypeId}/webhooks/${webhookId}`,
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

    throw new Error("Invalid response from update event type webhook API");
  } catch (error) {
    console.error("updateEventTypeWebhook error");
    throw error;
  }
}

/**
 * Delete an event type webhook
 */
export async function deleteEventTypeWebhook(
  eventTypeId: number,
  webhookId: string
): Promise<void> {
  try {
    await makeRequest(`/event-types/${eventTypeId}/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteEventTypeWebhook error");
    throw error;
  }
}
