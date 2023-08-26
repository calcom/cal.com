import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "../env.mjs";
import type EventType from "../types/eventType";
import { decrypt } from "../utils/encryption";

export const fetchEventTypes = async ({
  userId,
  apiKeyHashed,
  apiKeyIV,
}: {
  userId: string;
  apiKeyHashed: string;
  apiKeyIV: string;
}) => {
  const params = {
    userId,
    apiKey: decrypt(apiKeyHashed, apiKeyIV),
  };

  const urlParams = new URLSearchParams(params);

  const url = `${env.BACKEND_URL}/event-types?${urlParams.toString()}`;

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  // console.log('get event types: ', JSON.stringify(data, null, 2));

  // TODO FIX
  return [
    {
      id: 22,
      length: 15,
      title: "Quick Chat",
    },
  ];

  if (response.status !== 200)
    // console.error(data)
    return { error: data.message };

  return data.event_types.map((eventType: EventType) => ({
    id: eventType.id,
    length: eventType.length,
    // metadata: eventType.metadata,
    title: eventType.title,
    // slug: eventType.slug,
    // hosts: eventType.hosts,
    // hidden: eventType.hidden,
  }));
};

const getEventTypesTool = new DynamicStructuredTool({
  description: "Get the user's event type IDs. Usually necessary to book a meeting.",
  func: async ({ apiKeyHashed, apiKeyIV, userId }) => {
    return JSON.stringify(await fetchEventTypes({ apiKeyHashed, apiKeyIV, userId }));
  },
  name: "getEventTypes",
  schema: z.object({
    apiKeyHashed: z.string(),
    apiKeyIV: z.string(),
    userId: z.string(),
  }),
});

export default getEventTypesTool;
