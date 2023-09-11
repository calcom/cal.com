import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type { Availability } from "../types/availability";

/**
 * Fetches availability for a user by date range and event type.
 */
export const fetchAvailability = async ({
  apiKey,
  userId,
  dateFrom,
  dateTo,
  eventTypeId,
}: {
  apiKey: string;
  userId: number;
  dateFrom: string;
  dateTo: string;
  eventTypeId?: number;
}): Promise<Partial<Availability> | { error: string }> => {
  const params: { [k: string]: string } = {
    apiKey,
    userId: userId.toString(),
    dateFrom,
    dateTo,
  };

  if (eventTypeId) params["eventTypeId"] = eventTypeId.toString();

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/availability?${urlParams.toString()}`;

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return {
    busy: data.busy,
    dateRanges: data.dateRanges,
    timeZone: data.timeZone,
    workingHours: data.workingHours,
  };
};

const getAvailabilityTool = (apiKey: string, userId: number) => {
  return new DynamicStructuredTool({
    description: "Get availability within range.",
    func: async ({ dateFrom, dateTo, eventTypeId }) => {
      return JSON.stringify(
        await fetchAvailability({
          apiKey,
          userId,
          dateFrom,
          dateTo,
          eventTypeId,
        })
      );
    },
    name: "getAvailability",
    schema: z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      eventTypeId: z
        .number()
        .optional()
        .describe(
          "The ID of the event type to filter availability for if you've called getEventTypes, otherwise do not include."
        ),
    }),
  });
};

export default getAvailabilityTool;
