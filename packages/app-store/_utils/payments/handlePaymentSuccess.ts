import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import { sendScheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import EventManager, { placeholderCreatedEvent } from "@calcom/features/bookings/lib/EventManager";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import type { Actor } from "@calcom/features/bookings/lib/types/actor";
import { makeAppActor, makeAppActorUsingSlug } from "@calcom/features/bookings/lib/types/actor";
import { getPlatformParams } from "@calcom/features/platform-oauth-client/get-platform-params";
import { PlatformOAuthClientRepository } from "@calcom/features/platform-oauth-client/platform-oauth-client.repository";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { getAppNameFromSlug } from "@calcom/features/booking-audit/lib/getAppNameFromSlug";

const log = logger.getSubLogger({ prefix: ["[handlePaymentSuccess]"] });

export async function handlePaymentSuccess(params: { paymentId: number; appSlug: string; bookingId: number; }) {
  const { paymentId, bookingId, appSlug } = params;
  log.debug(`handling payment success for bookingId ${bookingId}`);
  const { booking, user: userWithCredentials, evt, eventType } = await getBooking(bookingId);

  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);

  let actor: Actor;
  const appData = apps?.[appSlug as keyof typeof apps];
  if (appData?.credentialId) {
    actor = makeAppActor({ credentialId: appData.credentialId });
  } else {
    log.warn(`Missing credentialId for payment app, using appSlug fallback`, {
      bookingId,
      eventTypeId: eventType?.id,
      appSlug,
    });
    actor = makeAppActorUsingSlug({
      appSlug,
      name: getAppNameFromSlug({ appSlug }),
    });
  }

  if (booking.location) evt.location = booking.location;

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
    status: BookingStatus.ACCEPTED,
  };

  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(userWithCredentials, {
    ...booking.eventType,
    metadata: booking.eventType?.metadata as EventTypeMetadata,
  });

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;

  const platformOAuthClientRepository = new PlatformOAuthClientRepository();
  const platformOAuthClient = userWithCredentials.isPlatformManaged
    ? await platformOAuthClientRepository.getByUserId(userWithCredentials.id)
    : null;
  const areCalendarEventsEnabled = platformOAuthClient?.areCalendarEventsEnabled ?? true;
  const areEmailsEnabled = platformOAuthClient?.areEmailsEnabled ?? true;

  if (isConfirmed) {
    const eventManager = new EventManager({ ...userWithCredentials, credentials: allCredentials }, apps);
    const scheduleResult = areCalendarEventsEnabled
      ? await eventManager.create(evt)
      : placeholderCreatedEvent;
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
        user: { ...userWithCredentials, credentials: allCredentials },
        evt,
        prisma,
        bookingId: booking.id,
        booking,
        paid: true,
        platformClientParams: platformOAuthClient ? getPlatformParams(platformOAuthClient) : undefined,
        source: "WEBHOOK",
        actor,
      });
    } else {
      await handleBookingRequested({
        evt,
        booking,
      });
      log.debug(`handling booking request for eventId ${eventType.id}`);
    }
  } else if (areEmailsEnabled) {
    await sendScheduledEmailsAndSMS({ ...evt }, undefined, undefined, undefined, eventType.metadata);
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}
