import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import { runWithTenants } from "@calcom/prisma/store/prismaStore";
import { TENANT_LIST } from "@calcom/prisma/store/tenants";

import { checkRegularUsername } from "./checkRegularUsername";
import { usernameCheck as checkPremiumUsername } from "./username";

// TODO: Replace `lib/checkPremiumUsername` with `usernameCheck` and then import checkPremiumUsername directly here.
// We want to remove dependency on website for signup stuff as signup is now part of app.

// Multi-tenant username check wrapper
export async function checkUsernameMultiTenant(username: string, currentOrgDomain?: string | null) {
  // Helper to check in a specific tenant
  async function checkInTenant(tenant: string) {
    return runWithTenants(tenant, async () =>
      !IS_PREMIUM_USERNAME_ENABLED
        ? checkRegularUsername(username, currentOrgDomain)
        : checkPremiumUsername(username, currentOrgDomain)
    );
  }

  // check in all tenants
  const results = await Promise.all(TENANT_LIST.map(checkInTenant));

  const available = results.every((result) => result.available);
  const premium = results.some((result) => result.premium);

  // Suggestion logic: only suggest if unavailable in either
  let suggestedUsername = undefined;
  if (!available) {
    // Try to find a suggestion available in both tenants
    const base = username;
    let attempt = 1;
    let found = false;
    while (attempt < 100 && !found) {
      const candidate = `${base}${String(attempt).padStart(3, "0")}`;
      const results = await Promise.all(TENANT_LIST.map(checkInTenant));
      const available = results.every((result) => result.available);
      if (available) {
        suggestedUsername = candidate;
        found = true;
      } else {
        attempt++;
      }
    }
    // fallback: use first suggestion from either
    if (!suggestedUsername) {
      suggestedUsername = results.find((result) => "suggestedUsername" in result)?.suggestedUsername;
    }
  }

  return {
    available,
    premium,
    ...(suggestedUsername ? { suggestedUsername } : {}),
  };
}

// Export the multi-tenant version as the main checkUsername
export const checkUsername = checkUsernameMultiTenant;
