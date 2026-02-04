/**
 * Utility functions for JSON parsing and payload sanitization
 */

/**
 * Safely parse JSON response with structure validation.
 * Validates that the input is a non-null object before returning.
 * This prevents prototype pollution and ensures type safety.
 */
export function safeParseJson(jsonString: string): Record<string, unknown> | null {
  if (typeof jsonString !== "string" || !jsonString.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);

    // Validate it's a plain object (not null, array, or primitive)
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.getPrototypeOf(parsed) === Object.prototype
    ) {
      return parsed as Record<string, unknown>;
    }

    // Also accept arrays as valid JSON responses
    if (Array.isArray(parsed)) {
      return { data: parsed } as Record<string, unknown>;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON error response with structure validation.
 * Validates the expected error response structure before returning.
 */
export function safeParseErrorJson(
  jsonString: string
): { error?: { message?: string }; message?: string } | null {
  if (typeof jsonString !== "string" || !jsonString.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonString);

    // Validate it's a plain object
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validate expected error structure - must have error or message property with correct types
    const hasValidErrorProp =
      obj.error === undefined ||
      (typeof obj.error === "object" &&
        obj.error !== null &&
        ((obj.error as Record<string, unknown>).message === undefined ||
          typeof (obj.error as Record<string, unknown>).message === "string"));

    const hasValidMessageProp = obj.message === undefined || typeof obj.message === "string";

    if (hasValidErrorProp && hasValidMessageProp) {
      return obj as { error?: { message?: string }; message?: string };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitizes a payload before sending to the API.
 * - Removes keys with null values for array fields (API expects arrays or field to be omitted)
 * - Removes keys with undefined values
 * - Recursively sanitizes nested objects
 */
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  // Fields that should NEVER be sent as null - API expects array or omit entirely
  const arrayFields = [
    "lengthInMinutesOptions",
    "multipleDuration",
    "locations",
    "bookingFields",
    "hosts",
    "children",
    "customInputs",
  ];

  // Fields that can be null (to clear the value)
  const nullableFields = [
    "description",
    "successRedirectUrl",
    "slotInterval",
    "eventName",
    "timeZone",
    "interfaceLanguage",
  ];

  for (const [key, value] of Object.entries(payload)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Handle null values
    if (value === null) {
      // For array fields, skip entirely (don't send null)
      if (arrayFields.includes(key)) {
        console.warn(`Skipping null value for array field: ${key}`);
        continue;
      }
      // For nullable fields, allow null
      if (nullableFields.includes(key)) {
        sanitized[key] = null;
        continue;
      }
      // For other fields, skip null to be safe
      console.warn(`Skipping null value for field: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects (but not arrays)
    if (typeof value === "object" && !Array.isArray(value)) {
      const sanitizedNested = sanitizePayload(value as Record<string, unknown>);
      // Only include if the nested object has values
      if (Object.keys(sanitizedNested).length > 0) {
        sanitized[key] = sanitizedNested;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
