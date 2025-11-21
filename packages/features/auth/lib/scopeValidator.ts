import { AccessScope } from "@calcom/prisma/enums";
import { appOAuthScopesRegistry } from "@calcom/app-store/oauth.scopes.generated";

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

/**
 * Validates OAuth scopes for a specific client by checking against both
 * the AccessScope enum and the client's allowed scopes from app-store manifests.
 * 
 * @param input - Scope string or array to validate
 * @param clientId - OAuth client ID to validate scopes for
 * @param options - Validation options
 * @returns Validation result with sanitized scopes or error
 */
export async function parseAndValidateScopesForClient(
  input: string | string[],
  clientId: string,
  options?: { allowEmpty?: boolean }
): Promise<ScopeValidationResult> {
  const basicValidation = parseAndValidateScopes(input, options);
  if (!basicValidation.success) {
    return basicValidation;
  }

  const { OAuthClientRepository } = await import("./repositories/OAuthClientRepository");
  const repository = new OAuthClientRepository();
  const client = await repository.findByIdWithAppSlug(clientId);

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  if (!client.appSlug) {
    return basicValidation;
  }

  const appScopes = appOAuthScopesRegistry[client.appSlug];
  if (!appScopes) {
    return basicValidation;
  }

  const disallowedScopes = basicValidation.scopes.filter(
    (scope) => !appScopes.allowed.includes(scope)
  );

  if (disallowedScopes.length > 0) {
    return {
      success: false,
      error: `Scopes not allowed for this client: ${disallowedScopes.join(", ")}`,
    };
  }

  if (appScopes.required) {
    const missingRequiredScopes = appScopes.required.filter(
      (scope) => !basicValidation.scopes.includes(scope)
    );

    if (missingRequiredScopes.length > 0) {
      return {
        success: false,
        error: `Missing required scopes: ${missingRequiredScopes.join(", ")}`,
      };
    }
  }

  return basicValidation;
}
