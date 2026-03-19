import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { CAL_AI_AGENT_PHONE_NUMBER_FIELD, SMS_REMINDER_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import type { eventTypeBookingFields, FieldSource } from "@calcom/prisma/zod-utils";
import type { z } from "zod";
import { NON_TARGET_PHONE_FIELD_NAMES, UNIFIED_PHONE_TARGET } from "./constants";

export type Fields = z.infer<typeof eventTypeBookingFields>;

export const SMS_FIELD_TEMPLATE = {
  name: SMS_REMINDER_NUMBER_FIELD,
  type: "phone",
  defaultLabel: "number_text_notifications",
  defaultPlaceholder: "enter_phone_number",
  editable: "system",
} as const;

export const CALAI_FIELD_TEMPLATE = {
  name: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  type: "phone",
  defaultLabel: "phone_number_for_ai_call",
  defaultPlaceholder: "enter_phone_number",
  editable: "system",
} as const;

export type SubType = "sms" | "calai";

/** Reverse lookup: field name → subType. */
export const SUB_TYPE_MAP: Record<string, SubType> = {
  [SMS_REMINDER_NUMBER_FIELD]: "sms",
  [CAL_AI_AGENT_PHONE_NUMBER_FIELD]: "calai",
};

/** Field template and subType for each non-target phone field, used by splitSourcesToTargetField. */
const SPLIT_TARGET_CONFIG: Record<SubType, { fieldName: string; template: typeof SMS_FIELD_TEMPLATE | typeof CALAI_FIELD_TEMPLATE }> = {
  sms: { fieldName: SMS_REMINDER_NUMBER_FIELD, template: SMS_FIELD_TEMPLATE },
  calai: { fieldName: CAL_AI_AGENT_PHONE_NUMBER_FIELD, template: CALAI_FIELD_TEMPLATE },
};

/**
 * Moves sources with a given subType from the unified field into their
 * dedicated non-target field (creating it if it doesn't exist).
 */
function splitSourcesToTargetField(bookingFields: Fields, sources: FieldSource[], subType: SubType): void {
  if (sources.length === 0) return;

  const { fieldName, template } = SPLIT_TARGET_CONFIG[subType];
  const targetIdx = bookingFields.findIndex(
    (f) => getFieldIdentifier(f.name) === getFieldIdentifier(fieldName)
  );

  if (targetIdx !== -1) {
    const targetField = bookingFields[targetIdx];
    const existingSources = [...(targetField.sources ?? [])];
    for (const source of sources) {
      if (!existingSources.some((s) => s.id === source.id && s.type === "workflow")) {
        existingSources.push(source);
      }
    }
    bookingFields[targetIdx] = {
      ...targetField,
      sources: existingSources,
      required: existingSources.some((s) => s.fieldRequired),
    };
  } else {
    bookingFields.push({
      ...template,
      sources,
      required: sources.some((s) => s.fieldRequired),
    });
  }
}

/**
 * Merges workflow sources from non-target phone fields (SMS/Cal.ai) into the attendeePhoneNumber field.
 *
 * TARGET FIELD: attendeePhoneNumber (ATTENDEE_PHONE_NUMBER_FIELD)
 *   - This is the unified field that serves as the merge target
 *   - All workflow sources from non-target fields are consolidated here
 *   - Must exist for merging to occur (throws error if missing when sources need merging)
 *
 * NON-TARGET FIELDS (merged FROM these fields INTO attendeePhoneNumber):
 *   - smsReminderNumber (SMS_REMINDER_NUMBER_FIELD) → sources get subType "sms"
 *   - calAiAgentNumber (CAL_AI_AGENT_PHONE_NUMBER_FIELD) → sources get subType "calai"
 *
 * MERGE BEHAVIOR:
 *   1. Extracts workflow sources from non-target SMS/Cal.ai fields
 *   2. Tags sources with appropriate subType ("sms" or "calai")
 *   3. Merges tagged sources into attendeePhoneNumber field
 *   4. Removes non-target fields that had workflow sources
 *   5. Updates attendeePhoneNumber visibility and required state based on merged sources
 *
 * @param bookingFields - Array of booking fields to process
 * @param workflowDerivedSources - Additional workflow sources from active workflows (server-side only)
 * @returns Fields array with sources merged into attendeePhoneNumber and non-target fields removed
 * @throws Error if attendeePhoneNumber field is missing but non-target fields with workflow sources exist
 */
export function mergePhoneFieldSources(
  bookingFields: Fields,
  workflowDerivedSources: FieldSource[] = []
): Fields {
  const targetFieldIdx = bookingFields.findIndex(
    (f) => getFieldIdentifier(f.name) === getFieldIdentifier(UNIFIED_PHONE_TARGET)
  );

  // Collect workflow sources from non-target fields before checking target existence
  const nonTargetWorkflowSources: { fieldName: string; sources: FieldSource[] }[] = [];
  for (const nonTargetFieldName of NON_TARGET_PHONE_FIELD_NAMES) {
    const nonTargetField = bookingFields.find(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(nonTargetFieldName)
    );
    if (!nonTargetField) continue;

    const workflowSources = (nonTargetField.sources ?? []).filter((s) => s.type === "workflow");
    if (workflowSources.length > 0) {
      nonTargetWorkflowSources.push({ fieldName: nonTargetFieldName, sources: workflowSources });
    }
  }

  const hasAnythingToMerge = nonTargetWorkflowSources.length > 0 || workflowDerivedSources.length > 0;

  if (targetFieldIdx === -1) {
    if (!hasAnythingToMerge) {
      return bookingFields;
    }
    throw new Error(
      "Cannot merge phone field sources: attendeePhoneNumber field is missing but non-target phone fields with workflow sources exist"
    );
  }

  const targetField = bookingFields[targetFieldIdx];
  const targetSources = targetField.sources ?? [];
  const mergedSources: FieldSource[] = [...targetSources];
  let hasWorkflowSources = targetSources.some((s) => s.type === "workflow");
  let anySourceRequired = false;

  const nonTargetFieldsToRemove = new Set<string>();

  for (const { fieldName: nonTargetFieldName, sources: workflowSources } of nonTargetWorkflowSources) {
    for (const source of workflowSources) {
      const subType = SUB_TYPE_MAP[nonTargetFieldName];
      const alreadyExists = mergedSources.some(
        (s) => s.id === source.id && s.type === "workflow" && s.subType === subType
      );
      if (!alreadyExists) {
        mergedSources.push({ ...source, subType });
        hasWorkflowSources = true;
      }
      if (source.fieldRequired) {
        anySourceRequired = true;
      }
    }
    nonTargetFieldsToRemove.add(getFieldIdentifier(nonTargetFieldName));
  }

  for (const source of workflowDerivedSources) {
    const alreadyExists = mergedSources.some(
      (s) => s.id === source.id && s.type === "workflow" && s.subType === source.subType
    );
    if (!alreadyExists) {
      mergedSources.push(source);
      hasWorkflowSources = true;
    }
    if (source.fieldRequired) {
      anySourceRequired = true;
    }
  }

  const updatedTargetField = {
    ...targetField,
    sources: mergedSources,
    ...(hasWorkflowSources ? { hidden: false } : {}),
    ...(anySourceRequired ? { required: true } : {}),
  };

  return bookingFields
    .map((f, i) => (i === targetFieldIdx ? updatedTargetField : f))
    .filter((f) => !nonTargetFieldsToRemove.has(getFieldIdentifier(f.name)));
}

/**
 * Inverse of mergePhoneFieldSources — splits workflow sources from
 * attendeePhoneNumber back into separate SMS / Cal.ai fields.
 *
 * @param unifiedFieldOrigHidden - Original hidden state of the attendee phone field before merge.
 *   Provided by the UI layer (stored in react-hook-form state) so this function
 *   stays free of internal tracking properties. When provided and no remaining
 *   workflow sources exist, the field's hidden state is restored to this value.
 */
export interface TogglePhoneFieldsState {
  attendeePhoneHidden: boolean | undefined;
}

export interface TogglePhoneFieldsResult {
  bookingFields: Fields;
  state: TogglePhoneFieldsState;
}

export function toggleUnifiedPhoneFields({
  enable,
  bookingFields,
  previousState,
}: {
  enable: boolean;
  bookingFields: Fields;
  previousState?: TogglePhoneFieldsState;
}): TogglePhoneFieldsResult {
  if (enable) {
    const attendeePhoneField = bookingFields.find(
      (f) => getFieldIdentifier(f.name) === getFieldIdentifier(UNIFIED_PHONE_TARGET)
    );
    const attendeePhoneHidden = attendeePhoneField?.hidden ?? true;
    return {
      bookingFields: mergePhoneFieldSources(bookingFields),
      state: { attendeePhoneHidden },
    };
  } else {
    return {
      bookingFields: splitPhoneFieldSources(bookingFields, previousState?.attendeePhoneHidden),
      state: { attendeePhoneHidden: previousState?.attendeePhoneHidden },
    };
  }
}

export function splitPhoneFieldSources(bookingFields: Fields, unifiedFieldOrigHidden?: boolean): Fields {
  const unifiedPhoneTargetIdx = bookingFields.findIndex(
    (f) => getFieldIdentifier(f.name) === getFieldIdentifier(UNIFIED_PHONE_TARGET)
  );
  if (unifiedPhoneTargetIdx === -1) return bookingFields;

  const unifiedPhoneTargetField = bookingFields[unifiedPhoneTargetIdx];
  const unifiedPhoneTargetSources = unifiedPhoneTargetField.sources ?? [];

  const sourcesToSplitToSmsField: FieldSource[] = [];
  const sourcesToSplitToCalAiField: FieldSource[] = [];
  const sourcesRemainingInUnifiedField: FieldSource[] = [];

  for (const source of unifiedPhoneTargetSources) {
    if (source.subType === "sms") {
      sourcesToSplitToSmsField.push(source);
    } else if (source.subType === "calai") {
      sourcesToSplitToCalAiField.push(source);
    } else {
      sourcesRemainingInUnifiedField.push(source);
    }
  }

  if (sourcesToSplitToSmsField.length === 0 && sourcesToSplitToCalAiField.length === 0) return bookingFields;

  const hasRemainingWorkflowSources = sourcesRemainingInUnifiedField.some((s) => s.type === "workflow");

  const shouldRestoreHidden =
    !hasRemainingWorkflowSources && unifiedPhoneTargetField.editable === "system-but-optional";

  const result = [...bookingFields];

  result[unifiedPhoneTargetIdx] = {
    ...unifiedPhoneTargetField,
    sources: sourcesRemainingInUnifiedField,
    ...(shouldRestoreHidden ? { hidden: unifiedFieldOrigHidden ?? true } : {}),
  };

  splitSourcesToTargetField(result, sourcesToSplitToSmsField, "sms");
  splitSourcesToTargetField(result, sourcesToSplitToCalAiField, "calai");

  return result;
}
