import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type { EventType } from "../types/eventType";

/**
 * Fetches event types by user ID.
 */
export const fetchEventTypes = async ({ apiKey, userId }: { apiKey: string; userId?: number }) => {
  const params: Record<string, string> = {
    apiKey,
  };

  if (userId) {
    params["userId"] = userId.toString();
  }

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/event-types?${urlParams.toString()}`;

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return data.event_types.map((eventType: EventType) => ({
    id: eventType.id,
    slug: eventType.slug,
    length: eventType.length,
    title: eventType.title,
  }));
};

const getEventTypesTool = (apiKey: string) => {
  return new DynamicStructuredTool({
    description: "Get a user's event type IDs. Usually necessary to book a meeting.",
    func: async ({ userId }) => {
      return JSON.stringify(
        await fetchEventTypes({
          apiKey,
          userId,
        })
      );
    },
    name: "getEventTypes",
    schema: z.object({
      userId: z.number().optional().describe("The user ID. Defaults to the primary user's ID."),
    }),
  });
};

export default getEventTypesTool;
