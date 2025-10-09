import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import logger from "@calcom/lib/logger";

import { extractDomainFromEmail } from "../utils/normalization";

export const checkIfFreeEmailDomain = async (email: string) => {
  try {
    const emailDomain = extractDomainFromEmail(email);
    const domainWithoutAt = emailDomain.slice(1);

    // If there's no email domain return as if it was a free email domain
    if (!domainWithoutAt) return true;

    // Gmail and Outlook are one of the most common email domains so we don't need to check the domains list
    if (domainWithoutAt === "gmail.com" || domainWithoutAt === "outlook.com") return true;

    const watchlist = await getWatchlistFeature();
    return await watchlist.globalBlocking.isFreeEmailDomain(domainWithoutAt);
  } catch (err) {
    logger.error(err);
    // If normalization fails, treat as free email domain for safety
    return true;
  }
};
