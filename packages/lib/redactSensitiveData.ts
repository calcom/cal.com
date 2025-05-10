import logger from "./logger";

/**
 * Creates a replacer function with the redaction keys captured in a closure.
 * This avoids the need for explicit 'bind'.
 *
 * @param keysToRedactSet - A Set containing the string keys to redact.
 * @returns A replacer function suitable for JSON.stringify.
 */
function createReplacer(keysToRedactSet: Set<string>): (key: string, value: any) => any {
  return function (key: string, value: any): any {
    if (keysToRedactSet.has(key)) {
      // Omit the key-value pair if the key is in the set.
      return undefined;
    }
    // Keep the value otherwise.
    return value;
  };
}

// Fields that might contain sensitive data
const SENSITIVE_FIELDS = [
  "accessToken",
  "api_key",
  "apiKey",
  "auth",
  "authorization",
  "client_id",
  "client_secret",
  "credential",
  "hash",
  "key",
  "password",
  "refreshToken",
  "secret",
  "token",
];

// Create a Set for efficient O(1) average time complexity lookups
const SENSITIVE_FIELDS_SET = new Set<string>(SENSITIVE_FIELDS);

export function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  try {
    const closureReplacer = createReplacer(SENSITIVE_FIELDS_SET);
    return JSON.parse(JSON.stringify(data, closureReplacer, 2));
  } catch (error) {
    // Fallback or logging if JSON operations fail
    logger.error("Failed to redact sensitive data using JSON.stringify/parse", error);
    // Return a generic redacted object or the original data as a fallback
    return { error: "Redaction failed" };
  }
}
