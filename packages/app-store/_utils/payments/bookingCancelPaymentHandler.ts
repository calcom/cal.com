import type { Payment, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

export interface BookingCancelPaymentHandlerInput {
  payment: Payment[];
  eventType: {
    owner: {
      id: number;
    };
    teamId: number;
    calIdTeamId: number;
  } | null;
}

const log = logger.getSubLogger({ prefix: ["bookingCancelPaymentHandler"] });

const bookingCancelPaymentHandler = async (booking: BookingCancelPaymentHandlerInput) => {
  if (booking.payment.length === 0) {
    log.info("No payments associated with this booking, skipping payment handling");
    return;
  }

  let eventTypeOwnerId;

  // Determine event type owner ID
  if (booking.eventType?.owner) {
    eventTypeOwnerId = booking.eventType.owner.id;
  } else if (booking.eventType?.calIdTeamId) {
    const teamOwner = await prisma.calIdMembership.findFirst({
      where: {
        teamId: booking.eventType.calIdTeamId,
        role: MembershipRole.OWNER,
      },
      select: {
        userId: true,
      },
    });

    eventTypeOwnerId = teamOwner?.userId;
  }

  if (!eventTypeOwnerId) {
    throw new Error("Event Type owner not found for obtaining payment app credentials");
  }

  // Process each payment
  for (const payment of booking.payment) {
    // Retrieve payment app credentials for the current payment
    const paymentAppCredential = await prisma.credential.findFirst({
      where: {
        userId: eventTypeOwnerId,
        appId: payment.appId,
      },
      select: {
        key: true,
        appId: true,
        app: {
          select: {
            categories: true,
            dirName: true,
          },
        },
      },
    });

    if (!paymentAppCredential) {
      console.warn(`Payment app credentials not found for appId ${payment.appId}`);
      log.warn(`Payment app credentials not found for appId ${payment.appId}`);
      continue;
    }

    // Load the payment app
    const paymentAppDirName = paymentAppCredential.app?.dirName as keyof typeof appStore;
    const paymentApp = (await appStore[paymentAppDirName]?.()) as PaymentApp | undefined;
    if (!paymentApp?.lib?.PaymentService) {
      console.warn(`Payment App service of type ${paymentApp} is not implemented`);
      log.warn(`Payment App service of type ${paymentApp} is not implemented`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PaymentService = paymentApp.lib.PaymentService as any;
    const paymentInstance = new PaymentService(paymentAppCredential) as IAbstractPaymentService;

    try {
      if (payment.success) {
        // Refund successful payments
        const paymentData = await paymentInstance.refund(payment.id);
        if (!paymentData.refunded) {
          console.error(`Payment ${payment.id} could not be refunded`);
          log.error(`Payment ${payment.id} could not be refunded`);
        }
      } else {
        // Delete unsuccessful payments
        const paymentDeleted = await paymentInstance.deletePayment(payment.id);
        if (!paymentDeleted) {
          console.error(`Payment ${payment.id} could not be deleted`);
          log.error(`Payment ${payment.id} could not be deleted`);
        }
      }
    } catch (error) {
      console.error(`Error processing payment ${payment.id}:`, error);
      log.error(`Error processing payment ${payment.id}:`, error);
      throw error;
    }
  }
};

export default bookingCancelPaymentHandler;
