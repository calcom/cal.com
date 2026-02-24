import { parseScopeParam } from "@calcom/features/oauth/constants";

const USER_RESOURCE_PREFIXES = ["PROFILE", "EVENT_TYPE", "BOOKING", "SCHEDULE", "APPS"] as const;

const TEAM_RESOURCE_PREFIXES = [
  "TEAM_PROFILE",
  "TEAM_EVENT_TYPE",
  "TEAM_BOOKING",
  "TEAM_SCHEDULE",
  "TEAM_MEMBERSHIP",
] as const;

const ORG_RESOURCE_PREFIXES = ["ORG_PROFILE", "ORG_EVENT_TYPE", "ORG_BOOKING", "ORG_SCHEDULE"] as const;

const SCOPE_RESOURCE_PREFIXES = [
  ...USER_RESOURCE_PREFIXES,
  ...TEAM_RESOURCE_PREFIXES,
  ...ORG_RESOURCE_PREFIXES,
] as const;

export type ScopeDisplayGroup = {
  categoryKey: string | null;
  items: string[];
};

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

function resolveDisplayItems(
  prefixes: readonly string[],
  scopeSet: Set<string>,
  t: (key: string) => string
): string[] {
  const items: string[] = [];
  for (const resource of prefixes) {
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

export function getGroupedScopeDisplayItems(
  scopes: string[],
  t: (key: string) => string
): ScopeDisplayGroup[] {
  const scopeSet = new Set(scopes);

  const userItems = resolveDisplayItems(USER_RESOURCE_PREFIXES, scopeSet, t);
  const teamItems = resolveDisplayItems(TEAM_RESOURCE_PREFIXES, scopeSet, t);
  const orgItems = resolveDisplayItems(ORG_RESOURCE_PREFIXES, scopeSet, t);

  const nonEmptyCategories = [
    { key: "oauth_scope_category_user", items: userItems },
    { key: "oauth_scope_category_team", items: teamItems },
    { key: "oauth_scope_category_organization", items: orgItems },
  ].filter((c) => c.items.length > 0);

  if (nonEmptyCategories.length <= 1) {
    const allItems = [...userItems, ...teamItems, ...orgItems];
    return [{ categoryKey: null, items: allItems }];
  }

  return nonEmptyCategories.map((c) => ({ categoryKey: c.key, items: c.items }));
}

export function getScopeDisplayItems(scopes: string[], t: (key: string) => string): string[] {
  const scopeSet = new Set(scopes);
  return resolveDisplayItems(SCOPE_RESOURCE_PREFIXES, scopeSet, t);
}

export function scopeTranslationKey(scope: string): string {
  return `oauth_scope_${scope.toLowerCase()}`;
}
