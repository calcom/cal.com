import { z } from "zod";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";
import { DateFieldTypeData, SalesforceFieldType, SalesforceRecordEnum, WhenToWriteToRecord } from "./lib/enums";

export const writeToBookingEntry = z.object({
  value: z.union([z.string(), z.boolean()]),
  fieldType: z.nativeEnum(SalesforceFieldType),
  whenToWrite: z.nativeEnum(WhenToWriteToRecord),
});

export type WriteToBookingEntry = z.infer<typeof writeToBookingEntry>;

/** Type guard to detect the new typed field config format vs. legacy flat strings. */
export function isWriteToBookingEntry(raw: unknown): raw is WriteToBookingEntry {
  return typeof raw === "object" && raw !== null && "value" in raw && "fieldType" in raw;
}

/**
 * Validates that a field mapping's value is compatible with its declared field type.
 * Returns null if valid, or a human-readable error message if invalid.
 */
export function validateFieldMapping(entry: {
  field: string;
  fieldType: SalesforceFieldType;
  value: string | boolean;
}): string | null {
  const { field, fieldType, value } = entry;

  if (!field.trim()) {
    return "Field name is required";
  }

  switch (fieldType) {
    case SalesforceFieldType.CHECKBOX:
      if (typeof value !== "boolean") {
        return `Checkbox field "${field}" requires a boolean value (True/False), got string "${value}"`;
      }
      break;
    case SalesforceFieldType.DATE:
      if (
        typeof value !== "string" ||
        !Object.values(DateFieldTypeData).includes(value as DateFieldTypeData)
      ) {
        return `Date field "${field}" requires a valid date reference (e.g. Booking Start Date)`;
      }
      break;
    case SalesforceFieldType.TEXT:
    case SalesforceFieldType.PHONE:
    case SalesforceFieldType.PICKLIST:
    case SalesforceFieldType.CUSTOM:
      if (typeof value !== "string" || value.trim() === "") {
        return `Field "${field}" requires a non-empty text value`;
      }
      break;
  }

  return null;
}

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

export const lastSyncErrorSchema = z.object({
  timestamp: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  droppedFields: z.array(z.string()).optional(),
});

export type LastSyncError = z.infer<typeof lastSyncErrorSchema>;

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
  onBookingWriteToEventObjectMap: z
    .record(z.string(), z.union([z.string(), z.boolean(), writeToBookingEntry]))
    .optional(),
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
  onCancelWriteToRecord: z.boolean().optional(),
  onCancelWriteToRecordFields: z.record(z.string(), writeToBookingEntry).optional(),
  lastSyncError: lastSyncErrorSchema.nullish(),
});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
