import { parseScopeParam } from "@calcom/features/oauth/constants";

const SCOPE_RESOURCE_PREFIXES = [
  "PROFILE",
  "EVENT_TYPE",
  "BOOKING",
  "SCHEDULE",
  "APPS",
  "TEAM_PROFILE",
  "TEAM_EVENT_TYPE",
  "TEAM_BOOKING",
  "TEAM_SCHEDULE",
  "TEAM_MEMBERSHIP",
  "ORG_PROFILE",
  "ORG_EVENT_TYPE",
  "ORG_BOOKING",
  "ORG_SCHEDULE",
] as const;

export function resolveScopesForTokens(
  scopeParam: string | null | undefined,
  clientScopes: string[]
): string[] {
  const parsed = parseScopeParam(scopeParam);
  if (parsed.length > 0) {
    return parsed;
  }
  return clientScopes;
}

export function getScopeDisplayItems(scopes: string[], t: (key: string) => string): string[] {
  const scopeSet = new Set(scopes);
  const items: string[] = [];

  for (const resource of SCOPE_RESOURCE_PREFIXES) {
    const hasRead = scopeSet.has(`${resource}_READ`);
    const hasWrite = scopeSet.has(`${resource}_WRITE`);

    if (hasRead && hasWrite) {
      items.push(t(scopeTranslationKey(`${resource}_READ_WRITE`)));
    } else if (hasRead) {
      items.push(t(scopeTranslationKey(`${resource}_READ`)));
    } else if (hasWrite) {
      items.push(t(scopeTranslationKey(`${resource}_WRITE`)));
    }
  }

  return items;
}

export function scopeTranslationKey(scope: string): string {
  return `oauth_scope_${scope.toLowerCase()}`;
}
