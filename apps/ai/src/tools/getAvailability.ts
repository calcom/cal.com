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
}: {
  apiKey: string;
  userId: number;
  dateFrom: string;
  dateTo: string;
}): Promise<Partial<Availability> | { error: string }> => {
  const params: { [k: string]: string } = {
    apiKey,
    userId: userId.toString(),
    dateFrom,
    dateTo,
  };

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

const getAvailabilityTool = (apiKey: string) => {
  return new DynamicStructuredTool({
    description: "Get availability of users within range.",
    func: async ({ userIds, dateFrom, dateTo }) => {
      return JSON.stringify(
        await Promise.all(
          userIds.map(
            async (userId) =>
              await fetchAvailability({
                userId: userId,
                apiKey,
                dateFrom,
                dateTo,
              })
          )
        )
      );
    },
    name: "getAvailability",
    schema: z.object({
      userIds: z.array(z.number()).describe("The users to fetch availability for."),
      dateFrom: z.string(),
      dateTo: z.string(),
    }),
  });
};

export default getAvailabilityTool;
