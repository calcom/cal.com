import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { HubspotRecordEnum } from "./lib/enums";

export const appDataSchema = eventTypeAppCardZod.extend({
  ignoreGuests: z.boolean().optional(),
  createEventOn: z.nativeEnum(HubspotRecordEnum).default(HubspotRecordEnum.CONTACT).optional(),
  skipContactCreation: z.boolean().optional(),
  checkForContact: z.boolean().optional(),
});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
