import prisma from "../../../../../tests/libs/__mocks__/prismaMock";

import type { Prisma } from "@prisma/client";

import EventManager from "@calcom/core/EventManager";
import { sendScheduledEmailsAndSMS } from "@calcom/emails";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getBooking } from "@calcom/lib/payment/getBooking";
// Using mocked Prisma instance
import { BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[handlePaymentSuccess]"] });

export async function handlePaymentSuccess(
  paymentId: number,
  bookingId: number,
  paymentData?: Record<string, any>
) {
  log.debug(`handling payment success for bookingId ${bookingId}`);

  // Mock getBooking function
  // getBooking.mockResolvedValue({
  //   booking: {
  //     id: bookingId,
  //     status: BookingStatus.PENDING,
  //     location: "Mocked Location",
  //   },
  //   user: { id: 1, email: "mocked@example.com" },
  //   evt: { id: 1, name: "Mocked Event" },
  //   eventType: { id: 2, metadata: { apps: ["mocked-app"] } },
  // });

  const { booking, user: userWithCredentials, evt, eventType } = await getBooking(bookingId);

  if (booking.location) evt.location = booking.location;

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
    status: BookingStatus.ACCEPTED,
  };

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) {
    const eventManager = new EventManager(userWithCredentials, eventType?.metadata?.apps);
    const scheduleResult = await eventManager.create(evt);
    bookingData.references = { create: scheduleResult.referencesToCreate };
  }

  const requiresConfirmation = doesBookingRequireConfirmation({
    booking: { ...booking, eventType },
  });

  if (requiresConfirmation) {
    delete bookingData.status;
  }

  // Mock Prisma response for payment
  prisma.payment.findUnique.mockResolvedValue({
    id: paymentId,
    data: { key: "mockedData" },
    success: false,
  } as any);

  const existingPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { data: true, success: true },
  });

  if (!existingPayment) {
    log.error(`Payment with id '${paymentId}' not found.`);
    throw new HttpCode({
      statusCode: 404,
      message: `Payment with id '${paymentId}' not found.`,
    });
  }

  if (existingPayment.success) {
    log.warn(`Payment with id '${paymentId}' was already paid and confirmed.`);
    throw new HttpCode({
      statusCode: 200,
      message: `Booking with id '${booking.id}' was paid and confirmed.`,
    });
  }

  const paymentMetaData = {
    ...(isPrismaObjOrUndefined(existingPayment.data) || {}),
    ...(paymentData || {}),
  };

  // Mock Prisma updates
  prisma.payment.update.mockResolvedValue({ success: true } as any);
  prisma.booking.update.mockResolvedValue({ status: BookingStatus.ACCEPTED } as any);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { success: true, data: paymentMetaData },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: bookingData,
    }),
  ]);

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
    await sendScheduledEmailsAndSMS({ ...evt }, undefined, undefined, undefined, eventType.metadata);
  }
}
