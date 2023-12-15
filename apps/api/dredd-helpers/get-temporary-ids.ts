import {
  createAttendee,
  createAvailability,
  createBooking,
  createBookingReference,
  createCustomInput,
  createEventType,
  createSchedule,
  createSelectedCalendar,
  createTeam,
  createWebhook,
} from "./creators";

// userId: 42, // not relevant since only admin can create users
// destinationCalendarId: 601,
// paymentId: 901, // no list method, need to get value from seed script

export async function getTemporaryIds(
  proUserApiKey: string,
  proUserId: number,
  proUserTeamApiKey: string,
  proUserTeamId: number
) {
  const team = await createTeam(proUserTeamApiKey);
  const schedule = await createSchedule(proUserApiKey);
  const availability = await createAvailability(proUserApiKey, schedule.id);

  const eventType = await createEventType(
    proUserApiKey,
    "Delete This Event Type",
    `delete-this-event-type-${Date.now()}`
  );

  const booking = await createBooking(proUserApiKey, eventType.id);
  const bookingReference = await createBookingReference(proUserApiKey, booking.id);
  const attendee = await createAttendee(proUserApiKey, booking.id);
  const customInput = await createCustomInput(proUserApiKey, eventType.id, "Delete Custom Input", "42");

  const integration = "foogle_calendar";
  const externalId = Date.now();
  await createSelectedCalendar(proUserApiKey, integration, `${externalId}`);

  const webhook = await createWebhook(
    proUserApiKey,
    `http://localhost:4242/delete-this-webhook-${Date.now()}`,
    ["BOOKING_CREATED"],
    false
  );

  return {
    teamId: team.id,
    scheduleId: schedule.id,
    availabilityId: availability.id,
    eventTypeId: eventType.id,
    bookingId: booking.id,
    bookingReferenceId: bookingReference.id,
    attendeeId: attendee.id,
    customInputId: customInput.id,
    externalId,
    webhookId: webhook.id,
  };
}
