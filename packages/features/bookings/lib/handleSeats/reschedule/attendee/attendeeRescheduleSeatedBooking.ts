// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { sendRescheduledSeatEmailAndSMS } from "@calcom/emails";
import type EventManager from "@calcom/features/bookings/lib/EventManager";
import { shouldHideBrandingForEvent } from "@calcom/lib/hideBranding";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Person, CalendarEvent } from "@calcom/types/Calendar";

import { findBookingQuery } from "../../../handleNewBooking/findBookingQuery";
import lastAttendeeDeleteBooking from "../../lib/lastAttendeeDeleteBooking";
import type { RescheduleSeatedBookingObject, SeatAttendee, NewTimeSlotBooking } from "../../types";

const attendeeRescheduleSeatedBooking = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatAttendee: SeatAttendee,
  newTimeSlotBooking: NewTimeSlotBooking | null,
  originalBookingEvt: CalendarEvent,
  eventManager: EventManager
) => {
  const { tAttendees, bookingSeat, bookerEmail, evt, eventType } = rescheduleSeatedBookingObject;
  let { originalRescheduledBooking } = rescheduleSeatedBookingObject;
  const { organizerUser } = rescheduleSeatedBookingObject;

  type TeamForBranding = {
    id: number;
    hideBranding: boolean | null;
    parentId: number | null;
    parent: { hideBranding: boolean | null } | null;
  };

  const teamForBranding: TeamForBranding | null = eventType.team?.id
    ? await prisma.team.findUnique({
        where: { id: eventType.team.id },
        select: {
          id: true,
          hideBranding: true,
          parentId: true,
          parent: {
            select: {
              hideBranding: true,
            },
          },
        },
      })
    : null;

  const hideBranding = await shouldHideBrandingForEvent({
    eventTypeId: eventType.id,
    team: teamForBranding ?? null,
    owner: organizerUser ?? null,
    organizationId: (await (async () => {
      if (teamForBranding?.parentId) return teamForBranding.parentId;
      const organizerProfile = await prisma.profile.findFirst({
        where: { userId: organizerUser.id },
        select: { organizationId: true },
      });
      return organizerProfile?.organizationId ?? null;
    })()),
  });

  seatAttendee["language"] = { translate: tAttendees, locale: bookingSeat?.attendee.locale ?? "en" };

  // Update the original calendar event by removing the attendee that is rescheduling
  if (originalBookingEvt && originalRescheduledBooking) {
    // Event would probably be deleted so we first check than instead of updating references
    const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
      return attendee.email !== bookerEmail;
    });
    const deletedReference = await lastAttendeeDeleteBooking(
      originalRescheduledBooking,
      filteredAttendees,
      originalBookingEvt
    );

    if (!deletedReference) {
      await eventManager.updateCalendarAttendees(originalBookingEvt, originalRescheduledBooking);
    }
  }

  // If there is no booking then remove the attendee from the old booking and create a new one
  if (!newTimeSlotBooking) {
    await prisma.attendee.delete({
      where: {
        id: seatAttendee?.id,
      },
    });

    // We don't want to trigger rescheduling logic of the original booking
    originalRescheduledBooking = null;

    await sendRescheduledSeatEmailAndSMS({ ...evt, hideBranding }, seatAttendee as Person, eventType.metadata);

    return null;
  }

  // Need to change the new seat reference and attendee record to remove it from the old booking and add it to the new booking
  // https://stackoverflow.com/questions/4980963/database-insert-new-rows-or-update-existing-ones
  if (seatAttendee?.id && bookingSeat?.id) {
    await prisma.$transaction([
      prisma.attendee.update({
        where: {
          id: seatAttendee.id,
        },
        data: {
          bookingId: newTimeSlotBooking.id,
        },
      }),
      prisma.bookingSeat.update({
        where: {
          id: bookingSeat.id,
        },
        data: {
          bookingId: newTimeSlotBooking.id,
        },
      }),
    ]);
  }
  // Add the new attendees to the new time slot booking attendees
  for (const attendee of newTimeSlotBooking.attendees) {
    const translate = await getTranslation(attendee.locale ?? "en", "common");
    evt.attendees.push({
      email: attendee.email,
      name: attendee.name,
      timeZone: attendee.timeZone,
      language: { translate, locale: attendee.locale ?? "en" },
    });
  }

  const copyEvent = cloneDeep({ ...evt, iCalUID: newTimeSlotBooking.iCalUID });

  await eventManager.updateCalendarAttendees(copyEvent, newTimeSlotBooking);

  await sendRescheduledSeatEmailAndSMS({ ...copyEvent, hideBranding }, seatAttendee as Person, eventType.metadata);
  const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
    return attendee.email !== bookerEmail;
  });
  await lastAttendeeDeleteBooking(originalRescheduledBooking, filteredAttendees, originalBookingEvt);

  const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

  return { ...foundBooking, seatReferenceUid: bookingSeat?.referenceUid };
};

export default attendeeRescheduleSeatedBooking;
