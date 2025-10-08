import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

export const checkIfFreeEmailDomain = async (email: string) => {
  const emailDomain = email.split("@")[1].toLowerCase();
  // If there's no email domain return as if it was a free email domain
  if (!emailDomain) return true;

  // Gmail and Outlook are one of the most common email domains so we don't need to check the domains list
  if (emailDomain === "gmail.com" || emailDomain === "outlook.com") return true;

  // Check if email domain is marked as a free email domain using the façade
  const watchlist = await getWatchlistFeature();
  return await watchlist.globalBlocking.isFreeEmailDomain(emailDomain);
};
