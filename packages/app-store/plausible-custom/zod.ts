import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    plausibleUrl: z.string(),
    trackingId: z.string(),
  })
);

export const appKeysSchema = z.object({});
