import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { z } from "zod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    TRACKING_ID: z.string().optional(),
    API_HOST: z.string().optional(),
  })
);

export const appKeysSchema = z.object({});
