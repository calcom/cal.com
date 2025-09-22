import type { Logger } from "tslog";

import { safeStringify } from "@calcom/lib/safeStringify";
import { HashedLinkService } from "@calcom/lib/server/service/hashedLinkService";

// I am passing deps as an argument instead of having this module as a class and passing constructor dependencies because this is a very simple fn and having a class would be overkill.
/**
 * Updates the usage of a hashed link for a booking
 * @param hashedLink - The hashed link to update the usage of
 * @param bookingUid - The UID of the booking to update the usage of
 * @param deps - The dependencies to use
 * @returns void
 */
export const updateHashedLinkUsage = async (
  {
    hashedLink,
    bookingUid,
  }: {
    hashedLink: string;
    bookingUid: string;
  },
  deps: {
    log: Logger<unknown>;
  }
) => {
  const { log } = deps;
  try {
    const hashedLinkService = new HashedLinkService();
    await hashedLinkService.validateAndIncrementUsage(hashedLink);

    log.debug(`Successfully updated hashed link usage for booking ${bookingUid}`);
  } catch (error) {
    log.error(
      "Error while updating hashed link",
      safeStringify(error),
      safeStringify({
        error,
        bookingUid,
        hashedLink,
      })
    );
  }
};
