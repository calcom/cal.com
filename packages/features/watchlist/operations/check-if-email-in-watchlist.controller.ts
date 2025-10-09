import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { PrismaClient } from "@calcom/prisma/client";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";
import { normalizeEmail } from "../lib/utils/normalization";

function presenter(isBlocked: boolean): EmailBlockedCheckResponseDTO {
  return startSpan({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return { isBlocked };
  });
}

/**
 * Controllers perform auth/validation and orchestrate use-cases.
 * Tests can inject prismock by passing it as the third parameter.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  email: string,
  organizationId?: number,
  prisma?: PrismaClient
): Promise<EmailBlockedCheckResponseDTO> {
  return await startSpan({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    const normalizedEmail = normalizeEmail(email);

    // Get the watchlist feature with optional prisma injection
    const watchlist = await getWatchlistFeature(prisma);

    // Global first
    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return presenter(true);
    }

    // Then org
    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isEmailBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true);
      }
    }

    return presenter(false);
  });
}
