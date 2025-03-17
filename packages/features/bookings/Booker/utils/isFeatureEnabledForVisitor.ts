import { getCookie } from "@calcom/lib/cookie";

/**
 * NOTE: Feature can be easily rolled back by setting percentage to 0
 */
export const isVisitorWithinPercentage = ({ percentage }: { percentage: number }) => {
  // E2E tests must test all features regardless of their rollout percentage
  if (process.env.NEXT_PUBLIC_IS_E2E) {
    return true;
  }

  // Because uid cookie is known to be not accessible in third party context inside embed(in some cases), we could just return true if the feature is 100% enabled
  // It ensures that when the feature is 100% enabled, it is enabled in embeds too
  if (percentage >= 100) {
    return true;
  }
  // TODO: The cookie is currently set when a timeslot is selected but we plan to create it on visitor's visit itself
  // Current purpose is to identify the visitor who reserved a timeslot but could be used for feature rollout and other UX improvements(like if duplicate booking is attempted by the same person)
  const visitorId = getCookie("uid");
  if (!visitorId) {
    return false;
  }

  // Use the visitor UUID to deterministically generate a number between 0-100
  // We'll use the last 4 characters of the UUID as they should be sufficiently random
  const lastFourChars = visitorId.slice(-4);
  // Convert hex to decimal and take modulo 100 to get a number between 0-99
  const deterministicNumber = parseInt(lastFourChars, 16) % 100;

  // Enable if this number falls within the percentage
  return deterministicNumber < percentage;
};
