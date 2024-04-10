import type { Attendee } from "@prisma/client";

// eslint-disable-next-line no-restricted-imports
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { deleteMeeting } from "@calcom/core/videoClient";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { OriginalRescheduledBooking } from "../../handleNewBooking";

/* Check if the original booking has no more attendees, if so delete the booking
  and any calendar or video integrations */
const lastAttendeeDeleteBooking = async (
  originalRescheduledBooking: OriginalRescheduledBooking,
  filteredAttendees: Partial<Attendee>[] | undefined,
  originalBookingEvt?: CalendarEvent
) => {
  let deletedReferences = false;
  if ((!filteredAttendees || filteredAttendees.length === 0) && originalRescheduledBooking) {
    const integrationsToDelete = [];

    for (const reference of originalRescheduledBooking.references) {
      if (reference.credentialId) {
        const credential = await prisma.credential.findUnique({
          where: {
            id: reference.credentialId,
          },
          select: credentialForCalendarServiceSelect,
        });

        if (credential) {
          if (reference.type.includes("_video")) {
            integrationsToDelete.push(deleteMeeting(credential, reference.uid));
          }
          if (reference.type.includes("_calendar") && originalBookingEvt) {
            const calendar = await getCalendar(credential);
            if (calendar) {
              integrationsToDelete.push(
                calendar?.deleteEvent(reference.uid, originalBookingEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    await Promise.all(integrationsToDelete).then(async () => {
      await prisma.booking.update({
        where: {
          id: originalRescheduledBooking.id,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });
    });
    deletedReferences = true;
  }
  return deletedReferences;
};

export default lastAttendeeDeleteBooking;
