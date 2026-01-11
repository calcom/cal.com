import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { sendRequestRescheduleEmailAndSMS } from "@calcom/emails/email-manager";
import { deleteMeeting } from "@calcom/features/conferencing/lib/videoClient";
import { CalendarEventBuilder } from "@calcom/lib/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/lib/builders/CalendarEvent/director";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Booking, BookingReference, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { Person } from "@calcom/types/Calendar";

import { getCalendar } from "../../_utils/getCalendar";

type PersonAttendeeCommonFields = Pick<User, "id" | "email" | "name" | "locale" | "timeZone" | "username"> & {
  phoneNumber?: string | null;
};

const Reschedule = async (bookingUid: string, cancellationReason: string) => {
  const bookingToReschedule = await prisma.booking.findFirstOrThrow({
    select: {
      id: true,
      uid: true,
      title: true,
      startTime: true,
      endTime: true,
      userId: true,
      eventTypeId: true,
      location: true,
      attendees: true,
      references: true,
      eventType: {
        select: {
          metadata: true,
          hideOrganizerEmail: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          timeZone: true,
          locale: true,
          username: true,
          credentials: true,
          destinationCalendar: true,
        },
      },
    },
    where: {
      uid: bookingUid,
      NOT: {
        status: {
          in: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
        },
      },
    },
  });

  if (bookingToReschedule && bookingToReschedule.eventTypeId && bookingToReschedule.user) {
    const userOwner = bookingToReschedule.user;
    const event = await prisma.eventType.findUniqueOrThrow({
      select: {
        title: true,
        schedulingType: true,
      },
      where: {
        id: bookingToReschedule.eventTypeId,
      },
    });
    await prisma.booking.update({
      where: {
        id: bookingToReschedule.id,
      },
      data: {
        rescheduled: true,
        cancellationReason,
        status: BookingStatus.CANCELLED,
        updatedAt: dayjs().toISOString(),
      },
    });
    const [mainAttendee] = bookingToReschedule.attendees;

    const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
    const usersToPeopleType = (
      users: PersonAttendeeCommonFields[],
      selectedLanguage: TFunction
    ): Person[] => {
      return users?.map((user) => {
        return {
          email: user.email || "",
          name: user.name || "",
          username: user?.username || "",
          language: { translate: selectedLanguage, locale: user.locale || "en" },
          timeZone: user?.timeZone,
          phoneNumber: user?.phoneNumber,
        };
      });
    };
    const userOwnerTranslation = await getTranslation(userOwner.locale ?? "en", "common");
    const [userOwnerAsPeopleType] = usersToPeopleType([userOwner], userOwnerTranslation);
    const builder = new CalendarEventBuilder();
    builder.init({
      title: bookingToReschedule.title,
      type: event.title,
      startTime: bookingToReschedule.startTime.toISOString(),
      endTime: bookingToReschedule.endTime.toISOString(),
      attendees: usersToPeopleType(
        // username field doesn't exists on attendee but could be in the future
        bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
        tAttendees
      ),
      organizer: userOwnerAsPeopleType,
      hideOrganizerEmail: bookingToReschedule.eventType?.hideOrganizerEmail,
      team: bookingToReschedule.eventType?.team
        ? {
            name: bookingToReschedule.eventType.team.name,
            id: bookingToReschedule.eventType.team.id,
            members: [],
          }
        : undefined,
    });
    const director = new CalendarEventDirector();
    director.setBuilder(builder);
    director.setExistingBooking(bookingToReschedule as unknown as Booking);
    director.setCancellationReason(cancellationReason);
    await director.buildForRescheduleEmail();
    // Handling calendar and videos cancellation
    // This can set previous time as available, until virtual calendar is done
    const credentialsMap = new Map();
    userOwner.credentials.forEach((credential) => {
      credentialsMap.set(credential.type, credential);
    });
    const bookingRefsFiltered: BookingReference[] = bookingToReschedule.references.filter(
      (ref) => !!credentialsMap.get(ref.type)
    );

    const promises = bookingRefsFiltered.map(async (bookingRef) => {
      if (!bookingRef.uid) return;

      if (bookingRef.type.endsWith("_calendar")) {
        const calendar = await getCalendar(credentialsMap.get(bookingRef.type), "booking");
        return calendar?.deleteEvent(bookingRef.uid, builder.calendarEvent);
      } else if (bookingRef.type.endsWith("_video")) {
        return deleteMeeting(credentialsMap.get(bookingRef.type), bookingRef.uid);
      }
    });
    try {
      await Promise.all(promises);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }

    // Send emails
    try {
      await sendRequestRescheduleEmailAndSMS(
        builder.calendarEvent,
        {
          rescheduleLink: builder.rescheduleLink,
        },
        bookingToReschedule?.eventType?.metadata as EventTypeMetadata
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
    return true;
  }
};

export default Reschedule;
