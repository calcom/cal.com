import { AccessScope } from "@calcom/prisma/enums";

export type ScopeValidationResult =
  | { success: true; scopes: AccessScope[] }
  | { success: false; error: string };

/**
 * Parses and validates OAuth scopes against the AccessScope enum.
 * Supports both space-delimited (OAuth spec) and comma-delimited formats.
 * 
 * @param input - Scope string or array to validate
 * @param options - Validation options
 * @returns Validation result with sanitized scopes or error
 */
export function parseAndValidateScopes(
  input: string | string[],
  options?: { allowEmpty?: boolean }
): ScopeValidationResult {
  let scopeArray: string[];
  if (typeof input === "string") {
    scopeArray = input.split(/[\s,]+/).filter(Boolean);
  } else {
    scopeArray = input;
  }

  const normalized = Array.from(new Set(scopeArray.map((s) => s.trim().toUpperCase()))).sort();

  if (normalized.length === 0) {
    if (options?.allowEmpty === false) {
      return { success: false, error: "At least one scope is required" };
    }
    return { success: true, scopes: [AccessScope.READ_PROFILE] };
  }

  const totalLength = normalized.join(",").length;
  if (totalLength > 500) {
    return { success: false, error: "Scope string too long" };
  }

  const validPattern = /^[A-Z0-9_]+$/;
  for (const scope of normalized) {
    if (!validPattern.test(scope)) {
      return { success: false, error: `Invalid scope format: ${scope}` };
    }
  }

  const validScopes = Object.values(AccessScope);
  const invalidScopes = normalized.filter((s) => !validScopes.includes(s as AccessScope));

  if (invalidScopes.length > 0) {
    return { success: false, error: `Unknown scopes: ${invalidScopes.join(", ")}` };
  }

  return { success: true, scopes: normalized as AccessScope[] };
}
