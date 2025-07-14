import logger from "./logger";

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

/**
 * Creates a replacer function for JSON.stringify that redacts sensitive fields.
 * This approach is more efficient as it leverages native JSON serialization.
 */
function createReplacer(): (key: string, value: unknown) => unknown {
  // Use a WeakSet to track circular references
  const seen = new WeakSet();

  return function replacer(key: string, value: unknown): unknown {
    // Handle circular references
    if (value && typeof value === "object") {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }

    // Redact sensitive fields
    if (SENSITIVE_FIELDS_SET.has(key)) {
      return "[REDACTED]";
    }

    // Handle Error objects specially to preserve their structure
    if (value instanceof Error) {
      const errorObj: Record<string, unknown> = {
        name: value.name,
        message: value.message,
      };

      if (value.stack) {
        errorObj.stack = value.stack;
      }

      // Handle cause property safely
      if ("cause" in value && value.cause !== undefined) {
        errorObj.cause = value.cause;
      }

      return errorObj;
    }

    return value;
  };
}

/**
 * Redacts sensitive data from an object by replacing sensitive fields with a placeholder.
 * Uses JSON.stringify's replacer function for efficient serialization and redaction.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  try {
    const replacer = createReplacer();
    const jsonString = JSON.stringify(data, replacer);
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error("Failed to redact sensitive data", error);
    return { error: "Redaction failed" };
  }
}
