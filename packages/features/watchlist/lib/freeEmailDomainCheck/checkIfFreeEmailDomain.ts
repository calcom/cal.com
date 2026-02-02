import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type logger from "@calcom/lib/logger";

import { extractDomainFromEmail } from "../utils/normalization";

interface CheckFreeEmailDomainParams {
  email: string;
  logger?: ReturnType<typeof logger.getSubLogger>;
}

export const checkIfFreeEmailDomain = async (params: CheckFreeEmailDomainParams): Promise<boolean> => {
  const { email, logger: log } = params;

  try {
    const emailDomain = extractDomainFromEmail(email);

    // If there's no email domain return as if it was a free email domain
    if (!emailDomain) return true;

    // Gmail and Outlook are one of the most common email domains so we don't need to check the domains list
    if (emailDomain === "gmail.com" || emailDomain === "outlook.com") return true;

    const watchlist = await getWatchlistFeature();
    return await watchlist.globalBlocking.isFreeEmailDomain(emailDomain);
  } catch (err) {
    log?.error(err);
    // If normalization fails, treat as free email domain for safety
    return true;
  }
};
