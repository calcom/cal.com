import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import logger from "@calcom/lib/logger";
import type { Payment } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { handleNoShowFee } from "./handleNoShowFee";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";

export const processNoShowFeeOnCancellation = async ({
  booking,
  payments,
  cancelledByUserId,
}: {
  booking: Parameters<typeof handleNoShowFee>[0]["booking"];
  payments: Payment[];
  cancelledByUserId?: number;
}) => {
  const log = logger.getSubLogger({ prefix: ["processNoShowFeeOnCancellation"] });

  // Skip no-show fee if the booking was cancelled by the organizer or team/org admin
  if (cancelledByUserId && booking.userId === cancelledByUserId) {
    log.info(
      `Booking ${booking.uid} was cancelled by the organizer (${cancelledByUserId}), skipping no-show fee`
    );
    return;
  }

  // Skip no-show fee if the booking was cancelled by a team/org admin
  if (cancelledByUserId && booking.eventType?.teamId) {
    const membershipRepository = new MembershipRepository();
    const membership = await membershipRepository.findUniqueByUserIdAndTeamId({
      userId: cancelledByUserId,
      teamId: booking.eventType.teamId,
    });

    if (
      membership &&
      (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    ) {
      log.info(
        `Booking ${booking.uid} was cancelled by team admin/owner (${cancelledByUserId}), skipping no-show fee`
      );
      return;
    }
  }

  const paymentToCharge = payments.find(
    (payment) => payment.paymentOption === "HOLD" && payment.success === false
  );

  if (!paymentToCharge) {
    log.info(`No payment found to charge for booking ${booking.uid}`);
    return;
  }

  // Parse the event type metadata
  const eventTypeMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(booking.eventType?.metadata ?? {});

  // Determine if we need to charge the no-show fee
  const shouldChargeNoShowFee = shouldChargeNoShowCancellationFee({
    booking,
    eventTypeMetadata,
    payment: paymentToCharge,
  });

  if (!shouldChargeNoShowFee) {
    log.info(`Date is not valid for no-show fee to charge for booking ${booking.uid}`);
    return;
  }

  // Process charging the no show fee
  try {
    await handleNoShowFee({
      booking,
      payment: paymentToCharge,
    });
  } catch (error) {
    log.error(`Error charging no-show fee for booking ${booking.uid}`, error);
    throw new Error(`Failed to charge no-show fee with error ${error}`);
  }
};
