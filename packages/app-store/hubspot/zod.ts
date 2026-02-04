import { z } from "zod";
import { writeToBookingEntry } from "../_lib/crm-schemas";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export { CrmFieldType, DateFieldType, WhenToWrite } from "../_lib/crm-enums";
export { writeToBookingEntry, writeToRecordEntrySchema } from "../_lib/crm-schemas";

export const appDataSchema = eventTypeAppCardZod.extend({
  ignoreGuests: z.boolean().optional(),
  skipContactCreation: z.boolean().optional(),
  setOrganizerAsOwner: z.boolean().optional(),
  overwriteContactOwner: z.boolean().optional(),
  onBookingWriteToEventObject: z.boolean().optional(),
  onBookingWriteToEventObjectFields: z.record(z.string(), writeToBookingEntry).optional(),
  roundRobinLeadSkip: z.boolean().optional(),
  ifFreeEmailDomainSkipOwnerCheck: z.boolean().optional(),
});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
