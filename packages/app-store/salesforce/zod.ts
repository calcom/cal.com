import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { SalesforceRecordEnum, WhenToWriteToRecord, SalesforceFieldType } from "./lib/enums";

const writeToRecordEntry = z.object({
  value: z.string(),
  fieldType: z.nativeEnum(SalesforceFieldType),
  whenToWrite: z.nativeEnum(WhenToWriteToRecord),
});

export const routingFormOptions = z
  .object({
    rrSkipToAccountLookupField: z.boolean().optional(),
    rrSKipToAccountLookupFieldName: z.string().optional(),
  })
  .optional();

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
  onBookingWriteToRecordFields: z.record(z.string(), writeToRecordEntry).optional(),
  ignoreGuests: z.boolean().optional(),
});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
