import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod;

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_uris: z.string().min(1),
  webhook_signing_key: z.string().nullish(),
});
