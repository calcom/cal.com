import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    trackedDomain: z.string(),
  })
);

export const appKeysSchema = z.object({});
