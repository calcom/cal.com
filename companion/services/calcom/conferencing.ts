/**
 * Conferencing functions for Cal.com API
 */

import type { ConferencingOption } from "../types";

import { makeRequest } from "./request";

/**
 * Get conferencing options for the authenticated user
 */
export async function getConferencingOptions(): Promise<ConferencingOption[]> {
  try {
    const response = await makeRequest<{
      status: string;
      data: ConferencingOption[];
    }>("/conferencing");

    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("getConferencingOptions error");
    throw error;
  }
}
