import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

export type GetDominantAccountIdInput = {
  AccountId: string;
}[];

export default function getDominantAccountId(contacts: GetDominantAccountIdInput) {
  const log = logger.getSubLogger({ prefix: [`[getDominantAccountId]:${contacts}`] });
  // To get the dominant AccountId we only need to iterate through half the array
  const iterateLength = Math.ceil(contacts.length / 2);
  // Store AccountId frequencies
  const accountIdCounts: { [accountId: string]: number } = {};

  for (const contact of contacts) {
    const accountId = contact.AccountId;
    accountIdCounts[accountId] = (accountIdCounts[accountId] || 0) + 1;
    // If the number of AccountIds makes up 50% of the array length then return early
    if (accountIdCounts[accountId] > iterateLength) return accountId;
  }

  // Else figure out which AccountId occurs the most
  let dominantAccountId;
  let highestCount = 0;

  for (const accountId in accountIdCounts) {
    if (accountIdCounts[accountId] > highestCount) {
      highestCount = accountIdCounts[accountId];
      dominantAccountId = accountId;
    }
  }

  log.info("Dominant AccountId", safeStringify({ dominantAccountId }));
  return dominantAccountId;
}
