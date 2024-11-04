import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { SalesforceRecordEnum } from "./lib/recordEnum";

enum WriteToRecordAction {
  EVERY_BOOKING = "every_booking",
  FIELD_EMPTY = "field_empty",
}

const writeToRecordEntry = z.object({
  fieldName: z.string(),
  value: z.string(),
  action: z.nativeEnum(WriteToRecordAction),
});

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
  createEventOnLeadCheckForContact: z.boolean().optional(),
  onBookingChangeRecordOwner: z.boolean().optional(),
  onBookingChangeRecordOwnerName: z.string().optional(),
  sendNoShowAttendeeData: z.boolean().optional(),
  sendNoShowAttendeeDataField: z.string().optional(),
  onBookingWriteToRecord: z.boolean().optional(),
  onBookingWriteToRecordFields: z.array(writeToRecordEntry).optional(),
});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
