import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { createPrefixedIdSchema } from "@calcom/app-store/_lib/analytics-schemas";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackingId: createPrefixedIdSchema({ prefix: "G-", allowEmpty: true }).optional(),
  })
);

export const appKeysSchema = z.object({});
