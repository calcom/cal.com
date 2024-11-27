// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import { uuid } from "short-uuid";

import EventManager from "@calcom/core/EventManager";
import { sendScheduledSeatsEmailsAndSMS } from "@calcom/emails";
import { refreshCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/refreshCredentials";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { findBookingQuery } from "../../handleNewBooking/findBookingQuery";
import type { IEventTypePaymentCredentialType } from "../../handleNewBooking/types";
import type { SeatedBooking, NewSeatedBookingObject, HandleSeatsResultBooking } from "../types";

const createNewSeat = async (
  rescheduleSeatedBookingObject: NewSeatedBookingObject,
  seatedBooking: SeatedBooking,
  metadata?: Record<string, string>
) => {
  const {
    tAttendees,
    attendeeLanguage,
    invitee,
    eventType,
    additionalNotes,
    noEmail,
    paymentAppData,
    allCredentials,
    organizerUser,
    fullName,
    bookerEmail,
    responses,
    workflows,
    bookerPhoneNumber,
  } = rescheduleSeatedBookingObject;
  let { evt } = rescheduleSeatedBookingObject;
  let resultBooking: HandleSeatsResultBooking;
  // Need to add translation for attendees to pass type checks. Since these values are never written to the db we can just use the new attendee language
  const bookingAttendees = seatedBooking.attendees.map((attendee) => {
    return { ...attendee, language: { translate: tAttendees, locale: attendeeLanguage ?? "en" } };
  });

  evt = { ...evt, attendees: [...bookingAttendees, invitee[0]] };

  if (
    eventType.seatsPerTimeSlot &&
    eventType.seatsPerTimeSlot <= seatedBooking.attendees.filter((attendee) => !!attendee.bookingSeat).length
  ) {
    throw new HttpError({ statusCode: 409, message: ErrorCode.BookingSeatsFull });
  }

  const videoCallReference = seatedBooking.references.find((reference) => reference.type.includes("_video"));

  if (videoCallReference) {
    evt.videoCallData = {
      type: videoCallReference.type,
      id: videoCallReference.meetingId,
      password: videoCallReference?.meetingPassword,
      url: videoCallReference.meetingUrl,
    };
  }

  const attendeeUniqueId = uuid();

  const inviteeToAdd = invitee[0];

  await prisma.booking.update({
    where: {
      uid: seatedBooking.uid,
    },
    include: {
      attendees: true,
    },
    data: {
      attendees: {
        create: {
          email: inviteeToAdd.email,
          phoneNumber: inviteeToAdd.phoneNumber,
          name: inviteeToAdd.name,
          timeZone: inviteeToAdd.timeZone,
          locale: inviteeToAdd.language.locale,
          bookingSeat: {
            create: {
              referenceUid: attendeeUniqueId,
              data: {
                description: additionalNotes,
                responses,
              },
              metadata,
              booking: {
                connect: {
                  id: seatedBooking.id,
                },
              },
            },
          },
        },
      },
      ...(seatedBooking.status === BookingStatus.CANCELLED && { status: BookingStatus.ACCEPTED }),
    },
  });

  evt.attendeeSeatId = attendeeUniqueId;

  const newSeat = seatedBooking.attendees.length !== 0;

  /**
   * Remember objects are passed into functions as references
   * so if you modify it in a inner function it will be modified in the outer function
   * deep cloning evt to avoid this
   */
  if (!evt?.uid) {
    evt.uid = seatedBooking?.uid ?? null;
  }
  const copyEvent = cloneDeep(evt);
  copyEvent.uid = seatedBooking.uid;
  if (noEmail !== true) {
    let isHostConfirmationEmailsDisabled = false;
    let isAttendeeConfirmationEmailDisabled = false;

    isHostConfirmationEmailsDisabled = eventType.metadata?.disableStandardEmails?.confirmation?.host || false;
    isAttendeeConfirmationEmailDisabled =
      eventType.metadata?.disableStandardEmails?.confirmation?.attendee || false;

    if (isHostConfirmationEmailsDisabled) {
      isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
    }

    if (isAttendeeConfirmationEmailDisabled) {
      isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
    }
    await sendScheduledSeatsEmailsAndSMS(
      copyEvent,
      inviteeToAdd,
      newSeat,
      !!eventType.seatsShowAttendees,
      isHostConfirmationEmailsDisabled,
      isAttendeeConfirmationEmailDisabled,
      eventType.metadata
    );
  }
  const credentials = await refreshCredentials(allCredentials);
  const eventManager = new EventManager({ ...organizerUser, credentials }, eventType?.metadata?.apps);
  await eventManager.updateCalendarAttendees(evt, seatedBooking);

  const foundBooking = await findBookingQuery(seatedBooking.id);

  if (!Number.isNaN(paymentAppData.price) && paymentAppData.price > 0 && !!seatedBooking) {
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
        app: {
          categories: {
            hasSome: ["payment"],
          },
        },
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

    const eventTypePaymentAppCredential = credentialPaymentAppCategories.find((credential) => {
      return credential.appId === paymentAppData.appId;
    });

    if (!eventTypePaymentAppCredential) {
      throw new HttpError({ statusCode: 400, message: ErrorCode.MissingPaymentCredential });
    }
    if (!eventTypePaymentAppCredential?.appId) {
      throw new HttpError({ statusCode: 400, message: ErrorCode.MissingPaymentAppId });
    }

    const payment = await handlePayment(
      evt,
      eventType,
      eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      seatedBooking,
      fullName,
      bookerEmail,
      bookerPhoneNumber
    );

    resultBooking = { ...foundBooking };
    resultBooking["message"] = "Payment required";
    resultBooking["paymentUid"] = payment?.uid;
    resultBooking["id"] = payment?.id;
  } else {
    resultBooking = { ...foundBooking };
  }

  resultBooking["seatReferenceUid"] = evt.attendeeSeatId;

  return resultBooking;
};

export default createNewSeat;
