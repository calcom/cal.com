import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import { runWithTenants } from "@calcom/prisma/store/prismaStore";
import { Tenant } from "@calcom/prisma/store/tenants";

import { checkRegularUsername } from "./checkRegularUsername";
import { usernameCheck as checkPremiumUsername } from "./username";

// TODO: Replace `lib/checkPremiumUsername` with `usernameCheck` and then import checkPremiumUsername directly here.
// We want to remove dependency on website for signup stuff as signup is now part of app.

// Multi-tenant username check wrapper
export async function checkUsernameMultiTenant(username: string, currentOrgDomain?: string | null) {
  // Helper to check in a specific tenant
  async function checkInTenant(tenant: Tenant) {
    return runWithTenants(tenant, async () =>
      !IS_PREMIUM_USERNAME_ENABLED
        ? checkRegularUsername(username, currentOrgDomain)
        : checkPremiumUsername(username, currentOrgDomain)
    );
  }

  // Check in both tenants
  const [usResult, euResult] = await Promise.all([checkInTenant(Tenant.US), checkInTenant(Tenant.EU)]);

  // Merge logic: unavailable if either is unavailable
  const available = usResult.available && euResult.available;
  const premium = usResult.premium || euResult.premium;

  // Suggestion logic: only suggest if unavailable in either
  let suggestedUsername = undefined;
  if (!available) {
    // Try to find a suggestion available in both tenants
    const base = username;
    let attempt = 1;
    let found = false;
    while (attempt < 100 && !found) {
      const candidate = `${base}${String(attempt).padStart(3, "0")}`;
      const [us, eu] = await Promise.all([checkInTenant(Tenant.US), checkInTenant(Tenant.EU)]);
      if (us.available && eu.available) {
        suggestedUsername = candidate;
        found = true;
      } else {
        attempt++;
      }
    }
    // fallback: use first suggestion from either
    if (!suggestedUsername) {
      const usSuggestion = "suggestedUsername" in usResult ? usResult.suggestedUsername : undefined;
      const euSuggestion = "suggestedUsername" in euResult ? euResult.suggestedUsername : undefined;
      suggestedUsername = usSuggestion || euSuggestion;
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
