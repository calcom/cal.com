import { getBlockingService } from "@calcom/lib/di/watchlist/containers/watchlist";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { getEventTypeResponse } from "./getEventTypesFromDB";

interface BookingBlockingResult {
  isBlocked: boolean;
  decoyResponse?: {
    uid: string;
    success: boolean;
    message: string;
  };
}

const _checkBookingBlocking = async ({
  bookerEmail,
  eventType,
  bookingData,
}: {
  bookerEmail: string;
  eventType: getEventTypeResponse;
  bookingData?: Record<string, unknown>;
}): Promise<BookingBlockingResult> => {
  try {
    // Get organization context from eventType
    // For organization team events, use the team's parentId
    // For organization profile events, use the profile's organizationId
    const organizationId = eventType.team?.parentId || eventType.profile?.organizationId || undefined;

    const blockingService = getBlockingService();
    const blockingResult = await blockingService.isBlocked(bookerEmail, organizationId);

    if (blockingResult.isBlocked) {
      // Create decoy response that looks like a successful booking
      const decoyResponse = await blockingService.createDecoyResponse({
        email: bookerEmail,
        eventTypeId: eventType.id,
        organizationId,
        ...bookingData,
      });

      return {
        isBlocked: true,
        decoyResponse,
      };
    }

    return { isBlocked: false };
  } catch (error) {
    // If blocking service fails, don't block the booking to avoid disrupting legitimate users
    console.error("Booking blocking check failed:", error);
    return { isBlocked: false };
  }
};

export const checkBookingBlocking = withReporting(_checkBookingBlocking, "checkBookingBlocking");
