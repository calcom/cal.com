import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type { EventType } from "../types/eventType";
import { decrypt } from "../utils/encryption";

/**
 * Fetches event types by user ID.
 */
export const fetchEventTypes = async ({
  apiKeyHashed,
  apiKeyIV,
}: {
  apiKeyHashed: string;
  apiKeyIV: string;
}) => {
  // TODO: fix
  return [
    {
      id: 22,
      length: 15,
      title: "Quick Chat",
    },
  ];

  const params = {
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
  };

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
    length: eventType.length,
    title: eventType.title,
  }));
};

const getEventTypesTool = new DynamicStructuredTool({
  description: "Get the user's event type IDs. Usually necessary to book a meeting.",
  func: async ({ apiKeyHashed, apiKeyIV }) => {
    return JSON.stringify(await fetchEventTypes({ apiKeyHashed, apiKeyIV }));
  },
  name: "getEventTypes",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    userIdHashed: z.string(),
    userIdIV: z.string(),
  }),
});

export default getEventTypesTool;
