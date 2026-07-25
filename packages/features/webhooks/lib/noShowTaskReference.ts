import type { Prisma } from "@calcom/prisma/client";

/**
 * Task rows are unique on (referenceUid, type). Keying a no-show task on the booking uid alone
 * therefore collapses every subscriber of the same trigger into one row, so all subscribers but
 * the first are rejected. Scoping the reference to the webhook keeps one task per subscriber.
 */
export const getNoShowTaskReferenceUid = ({
  bookingUid,
  webhookId,
}: {
  bookingUid: string;
  webhookId: string;
}): string => `${bookingUid}_${webhookId}`;

/**
 * Booking uids are base58 short-uuids, so the `_` separator cannot appear in the booking part of
 * the reference. The bare-uid branch keeps tasks scheduled before this key change cancellable.
 */
export const getNoShowTaskReferenceUidFilter = (bookingUid: string): Prisma.TaskWhereInput => ({
  OR: [{ referenceUid: bookingUid }, { referenceUid: { startsWith: `${bookingUid}_` } }],
});
