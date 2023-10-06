import * as z from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    isSunrise: z.boolean(),
    baseId: z.string().optional(),
    tableId: z.string().optional(),
  })
);
export const appKeysSchema = z.object({
  personalAccessToken: z.string().min(1),
});

export type TAppKeysSchema = z.infer<typeof appKeysSchema>;
