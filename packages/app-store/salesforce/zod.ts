import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { SalesforceRecordEnum, WhenToWriteToRecord, SalesforceFieldType } from "./lib/enums";

export const writeToBookingEntry = z.object({
  value: z.union([z.string(), z.boolean()]),
  fieldType: z.nativeEnum(SalesforceFieldType),
  whenToWrite: z.nativeEnum(WhenToWriteToRecord),
});

export const writeToRecordEntrySchema = z.object({
  field: z.string(),
  fieldType: z.nativeEnum(SalesforceFieldType),
  value: z.union([z.string(), z.boolean()]),
  whenToWrite: z.nativeEnum(WhenToWriteToRecord),
});

export const writeToRecordDataSchema = z.record(z.string(), writeToBookingEntry);

export const RRSkipFieldRuleActionEnum = {
  IGNORE: "ignore",
  MUST_INCLUDE: "must_include",
} as const;

export const rrSkipFieldRuleSchema = z.object({
  field: z.string(),
  value: z.string(),
  action: z.enum([RRSkipFieldRuleActionEnum.IGNORE, RRSkipFieldRuleActionEnum.MUST_INCLUDE]),
});

export type RRSkipFieldRule = z.infer<typeof rrSkipFieldRuleSchema>;

export const routingFormOptions = z
  .object({
    rrSkipToAccountLookupField: z.boolean().optional(),
    rrSKipToAccountLookupFieldName: z.string().optional(),
  })
  .optional();

export const routingFormIncompleteBookingDataSchema = z.object({
  writeToRecordObject: writeToRecordDataSchema.optional(),
});

const optionalBooleanOnlyRunTimeValidation = z
  .any()
  .refine((val) => typeof val === "boolean" || val === undefined)
  .optional();

export const appDataSchema = eventTypeAppCardZod.extend({
  roundRobinLeadSkip: z.boolean().optional(),
  roundRobinSkipCheckRecordOn: z
    .nativeEnum(SalesforceRecordEnum)
    .default(SalesforceRecordEnum.CONTACT)
    .optional(),
  rrSkipFieldRules: z.array(rrSkipFieldRuleSchema).optional(),
  ifFreeEmailDomainSkipOwnerCheck: z.boolean().optional(),
  roundRobinSkipFallbackToLeadOwner: z.boolean().optional(),
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
  onBookingWriteToRecordFields: z.record(z.string(), writeToBookingEntry).optional(),
  ignoreGuests: z.boolean().optional(),
  onCancelWriteToEventRecord: z.boolean().optional(),
  onCancelWriteToEventRecordFields: z.record(z.string(), writeToBookingEntry).optional(),
});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
