import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type { EventType } from "../types/eventType";
import { context } from "../utils/context";

/**
 * Fetches event types by user ID.
 */
export const fetchEventTypes = async () => {
  // TODO: comment this out once the bug is fixed with get event types in the API app/
  return [
    {
      id: 22,
      length: 15,
      title: "Quick Chat",
    },
  ];

  const params = {
    apiKey: context.apiKey,
  };

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/event-types?${urlParams.toString()}`;

  console.log(url);

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return data.event_types.map((eventType: EventType) => ({
    id: eventType.id,
    length: eventType.length,
    title: eventType.title,
  }));
};

const getEventTypesTool = new DynamicStructuredTool({
  description: "Get the user's event type IDs. Usually necessary to book a meeting.",
  func: async () => {
    return JSON.stringify(await fetchEventTypes());
  },
  name: "getEventTypes",
  schema: z.object({}),
});

export default getEventTypesTool;
