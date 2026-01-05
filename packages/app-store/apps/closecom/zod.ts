import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/src/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod;

export const appKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});
