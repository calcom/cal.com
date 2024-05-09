import type { Prisma } from "@prisma/client";

import EventManager from "@calcom/core/EventManager";
import { sendScheduledEmailsAndSMS } from "@calcom/emails";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getBooking } from "@calcom/lib/payment/getBooking";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import logger from "../logger";

const log = logger.getSubLogger({ prefix: ["[handlePaymentSuccess]"] });
export async function handlePaymentSuccess(paymentId: number, bookingId: number) {
  log.debug(`handling payment success for bookingId ${bookingId}`);
  const { booking, user: userWithCredentials, evt, eventType } = await getBooking(bookingId);

  if (booking.location) evt.location = booking.location;

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
    status: BookingStatus.ACCEPTED,
  };

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) {
    const eventManager = new EventManager(userWithCredentials);
    const scheduleResult = await eventManager.create(evt);
    bookingData.references = { create: scheduleResult.referencesToCreate };
  }

  const requiresConfirmation = doesBookingRequireConfirmation({
    booking: {
      ...booking,
      eventType,
    },
  });

  if (requiresConfirmation) {
    delete bookingData.status;
  }
  const paymentUpdate = prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      success: true,
    },
  });

  const bookingUpdate = prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: bookingData,
  });

  await prisma.$transaction([paymentUpdate, bookingUpdate]);
  if (!isConfirmed) {
    if (!requiresConfirmation) {
      await handleConfirmation({
        user: userWithCredentials,
        evt,
        prisma,
        bookingId: booking.id,
        booking,
        paid: true,
      });
    } else {
      await handleBookingRequested({
        evt,
        booking,
      });
      log.debug(`handling booking request for eventId ${eventType.id}`);
    }
  } else {
    await sendScheduledEmailsAndSMS({ ...evt });
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}
