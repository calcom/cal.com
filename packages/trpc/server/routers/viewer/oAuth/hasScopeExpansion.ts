import type { AccessScope } from "@calcom/prisma/enums";

export function hasScopeExpansion(currentScopes: AccessScope[], newScopes: AccessScope[]): boolean {
  const clientScopes = new Set<string>(currentScopes);

  for (const newScope of newScopes) {
    if (clientScopes.has(newScope)) continue;

    if (newScope.endsWith("_READ")) {
      const correspondingWriteScope = newScope.replace("_READ", "_WRITE");
      if (clientScopes.has(correspondingWriteScope)) {
        continue;
      }
    }

    return true;
  }

  return false;
}
