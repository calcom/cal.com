import logger from "@calcom/lib/logger";
import type { Payment } from "@calcom/prisma/client";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

import { handleNoShowFee } from "./handleNoShowFee";
import { shouldChargeNoShowCancellationFee } from "./shouldChargeNoShowCancellationFee";

export const processNoShowFeeOnCancellation = async ({
  booking,
  payments,
}: {
  booking: Parameters<typeof handleNoShowFee>[0]["booking"];
  payments: Payment[];
}) => {
  const log = logger.getSubLogger({ prefix: ["processNoShowFeeOnCancellation"] });
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
