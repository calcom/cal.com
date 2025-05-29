import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";

import type { CancellationBySyncReason } from "../types";

export async function cancelBooking({
  bookingId,
  cancelledBy,
  cancellationReason,
}: {
  bookingId: number;
  cancelledBy: string;
  cancellationReason: CancellationBySyncReason;
}) {
  const response = await handleCancelBooking({
    bookingData: { id: bookingId, cancellationReason, cancelledBy },

    // It is being cancelled via Sync, so we don't have a userId
    userId: undefined,
  });
  if (!response.success) {
    throw new Error(`Failed to cancel booking ${bookingId}: ${response.message}`);
  }
}
