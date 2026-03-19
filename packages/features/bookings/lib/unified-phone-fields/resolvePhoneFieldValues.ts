import { CAL_AI_AGENT_PHONE_NUMBER_FIELD, SMS_REMINDER_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import {
  NON_TARGET_PHONE_FIELD_NAMES as PHONE_SOURCE_FIELDS,
  UNIFIED_PHONE_TARGET as UNIFIED_PHONE_TARGET_FIELD,
} from "./constants";

export type ResolvedPhoneFields = {
  smsReminderNumber: string | undefined;
  attendeePhoneNumber: string | undefined;
  calAiPhoneNumber: string | undefined;
};

function readPhoneField(responses: Record<string, unknown>, field: string): string | undefined {
  const value = typeof responses[field] === "string" ? (responses[field] as string) : undefined;
  return value || undefined;
}

/**
 * Resolves phone field values from booking responses.
 *
 * When unified phone fields is **disabled**: reads each field as-is from
 * responses. Falls back to `attendeePhoneNumber` for fields present in
 * `bookingFields` — and mutates `responses` with the fallback value so that
 * downstream schema validation (required-field checks) passes.
 *
 * When unified phone fields is **enabled**: mutates `responses` in place to
 * populate `attendeePhoneNumber` from available phone sources
 * (smsReminderNumber, calAiAgentPhoneNumber).
 *
 * Callers should pass the full original booking responses so the function
 * can read all phone sources. `bookingFields` controls which fields get set.
 *
 * Returns all resolved phone field values for callers that need them
 * (e.g. DB column persistence).
 */
export function resolveAndMutatePhoneFieldValues({
  responses,
  bookingFields,
  isUnifiedPhoneFieldsEnabled,
}: {
  responses: Record<string, unknown>;
  bookingFields?: { name: string }[];
  isUnifiedPhoneFieldsEnabled: boolean;
}): ResolvedPhoneFields {
  const responseSms = readPhoneField(responses, SMS_REMINDER_NUMBER_FIELD);
  const unifiedPhone = readPhoneField(responses, UNIFIED_PHONE_TARGET_FIELD);
  const attendeePhoneNumber = unifiedPhone;
  const responseCalAiPhone = readPhoneField(responses, CAL_AI_AGENT_PHONE_NUMBER_FIELD);

  // When disabled, each field is independent.
  // Fall back to attendeePhoneNumber only for fields that exist in bookingFields,
  // to handle stale booking requests or API V2 requests that only send attendeePhoneNumber
  // after unified was just toggled off.
  if (!isUnifiedPhoneFieldsEnabled) {
    // We use the fallback only if that field exists in bookingFields to avoid setting a field value when it wasn't even a question/field in the booking form
    const withFallbackToUnifiedPhone = ({
      value,
      fieldName,
    }: {
      value: string | undefined;
      fieldName: string;
    }) => {
      const resolved = value ?? (bookingFields?.some((f) => f.name === fieldName) ? unifiedPhone : undefined);
      // Mutate responses when using fallback so schema validation passes
      // (e.g. stale booker submitted only attendeePhoneNumber after unified was toggled off)
      if (resolved && !value) {
        responses[fieldName] = resolved;
      }
      return resolved;
    };

    return {
      smsReminderNumber: withFallbackToUnifiedPhone({
        value: responseSms,
        fieldName: SMS_REMINDER_NUMBER_FIELD,
      }),
      attendeePhoneNumber,
      calAiPhoneNumber: withFallbackToUnifiedPhone({
        value: responseCalAiPhone,
        fieldName: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
      }),
    };
  }

  // Resolve smsReminderNumber for DB column.
  // attendeePhoneNumber is the canonical field in unified mode, so we
  // fall through attendeePhone → sms → calAiPhone.
  const smsReminderNumber = unifiedPhone ?? responseSms ?? responseCalAiPhone ?? undefined;

  const baseResult = { smsReminderNumber, calAiPhoneNumber: responseCalAiPhone };

  // Populate attendeePhoneNumber from available sources

  // If bookingFields is provided (client), check that the unified target field exists
  if (bookingFields && !bookingFields.some((f) => f.name === UNIFIED_PHONE_TARGET_FIELD)) {
    return { ...baseResult, attendeePhoneNumber };
  }

  // Don't overwrite existing value
  if (unifiedPhone) {
    return { ...baseResult, attendeePhoneNumber };
  }

  // Try each phone source in priority order until we find a value
  const fallbackValue = PHONE_SOURCE_FIELDS.reduce<string | undefined>(
    (found, field) => found || readPhoneField(responses, field),
    undefined
  );

  if (fallbackValue) {
    responses[UNIFIED_PHONE_TARGET_FIELD] = fallbackValue;
  }

  return { ...baseResult, attendeePhoneNumber: fallbackValue };
}
