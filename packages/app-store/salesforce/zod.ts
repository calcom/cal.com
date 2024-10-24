import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { SalesforceRecordEnum } from "./lib/recordEnum";

export const appDataSchema = eventTypeAppCardZod.extend({
  roundRobinLeadSkip: z.boolean().optional(),
  roundRobinSkipCheckRecordOn: z
    .nativeEnum(SalesforceRecordEnum)
    .default(SalesforceRecordEnum.CONTACT)
    .optional(),
  skipContactCreation: z.boolean().optional(),
  createEventOn: z.nativeEnum(SalesforceRecordEnum).default(SalesforceRecordEnum.CONTACT).optional(),
  createNewContactUnderAccount: z.boolean().optional(),
  createLeadIfAccountNull: z.boolean().optional(),
  onBookingWriteToEventObject: z.boolean().optional(),
  onBookingWriteToEventObjectMap: z.record(z.any()).optional(),
});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
