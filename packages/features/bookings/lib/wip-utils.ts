import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/lib/CalendarEventBuilder";
import type { CalendarEvent } from "@calcom/prisma/client";

export async function buildEvent({
  reqBody,
  eventType,
  organizerUser,
  organizerEmail,
  attendeesList,
  additionalNotes,
  customInputs,
  bookerUrl,
  eventName,
  platformBookingLocation,
  bookingLocation,
  conferenceCredentialId,
  destinationCalendar,
  tOrganizer,
  getTimeFormatStringFromUserTimeFormat,
  isConfirmedByDefault,
  iCalUID,
  iCalSequence,
  platformClientId,
  platformRescheduleUrl,
  platformCancelUrl,
  platformBookingUrl,
  input,
  isTeamEventType,
  users,
}: {
  reqBody: any;
  eventType: any;
  organizerUser: any;
  organizerEmail: any;
  attendeesList: any;
  additionalNotes: any;
  customInputs: any;
  bookerUrl: any;
  eventName: any;
  platformBookingLocation: any;
  bookingLocation: any;
  conferenceCredentialId: any;
  destinationCalendar: any;
  tOrganizer: any;
  getTimeFormatStringFromUserTimeFormat: any;
  isConfirmedByDefault: any;
  iCalUID: any;
  iCalSequence: any;
  platformClientId: any;
  platformRescheduleUrl: any;
  platformCancelUrl: any;
  platformBookingUrl: any;
  input: any;
}) {
  let evt: CalendarEvent = new CalendarEventBuilder()
    .withBasicDetails({
      bookerUrl,
      title: eventName,
      startTime: dayjs(reqBody.start).utc().format(),
      endTime: dayjs(reqBody.end).utc().format(),
      additionalNotes,
    })
    .withEventType({
      slug: eventType.slug,
      description: eventType.description,
      id: eventType.id,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      schedulingType: eventType.schedulingType,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      // if seats are not enabled we should default true
      seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
      seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
      customReplyToEmail: eventType.customReplyToEmail,
    })
    .withOrganizer({
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerEmail,
      username: organizerUser.username || undefined,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    })
    .withAttendees(attendeesList)
    .withMetadataAndResponses({
      additionalNotes,
      customInputs,
      responses: reqBody.calEventResponses || null,
      userFieldsResponses: reqBody.calEventUserFieldsResponses || null,
    })
    .withLocation({
      location: platformBookingLocation ?? bookingLocation, // Will be processed by the EventManager later.
      conferenceCredentialId,
    })
    .withDestinationCalendar(destinationCalendar)
    .withIdentifiers({ iCalUID, iCalSequence })
    .withConfirmation({
      requiresConfirmation: !isConfirmedByDefault,
      isConfirmedByDefault,
    })
    .withPlatformVariables({
      platformClientId,
      platformRescheduleUrl,
      platformCancelUrl,
      platformBookingUrl,
    })
    .build();

  if (input.bookingData.thirdPartyRecurringEventId) {
    evt = CalendarEventBuilder.fromEvent(evt)
      .withRecurringEventId(input.bookingData.thirdPartyRecurringEventId)
      .build();
  }

  if (isTeamEventType) {
    evt = await buildEventForTeamEventType({
      existingEvent: evt,
      schedulingType: eventType.schedulingType,
      users,
      team: eventType.team,
      organizerUser,
    });
  }
  return evt;
}
