import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: z.string().default("").optional(),
  })
);
export const appKeysSchema = z.object({});
