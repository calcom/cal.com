import {
  getGlobalBlockingService,
  getOrganizationBlockingService,
} from "@calcom/features/di/watchlist/containers/watchlist";
import logger from "@calcom/lib/logger";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/checkRoutingFormBlocklist"] });

export async function checkRoutingFormBlocklist({
  emails,
  orgId,
}: {
  emails: string[];
  orgId: number | null;
}): Promise<{ isBlocked: boolean }> {
  if (emails.length === 0) {
    return { isBlocked: false };
  }

  try {
    const globalBlocking = getGlobalBlockingService();
    const checks = [globalBlocking.areBlocked(emails)];

    if (orgId) {
      const orgBlocking = getOrganizationBlockingService();
      checks.push(orgBlocking.areBlocked(emails, orgId));
    }

    const results = await Promise.all(checks);

    for (const resultMap of results) {
      const entries = Array.from(resultMap.values());
      for (const result of entries) {
        if (result.isBlocked) {
          moduleLogger.debug("Routing form submission blocked by watchlist");
          return { isBlocked: true };
        }
      }
    }

    return { isBlocked: false };
  } catch (error) {
    moduleLogger.error("Error checking routing form blocklist, failing open", { error });
    return { isBlocked: false };
  }
}
