import {
  createBookingReference,
  createCustomInput,
  createEventType,
  createSelectedCalendar,
  createWebhook,
} from "./creators";
import { getMe, getAttendees, getBookings, getSchedules, getTeams } from "./getters";

export async function getExistingIds(proUserApiKey: string, proUserTeamApiKey: string) {
  const me = await getMe(proUserApiKey);
  const teams = await getTeams(proUserTeamApiKey);
  const schedules = await getSchedules(proUserApiKey);
  const bookings = await getBookings(proUserApiKey);
  const bookingReference = await createBookingReference(proUserApiKey, bookings[0].id);
  const attendees = await getAttendees(proUserApiKey);
  const eventType = await createEventType(
    proUserApiKey,
    "New Event Type",
    `new-event-type-${Date.now()}`,
    30
  );
  const customInput = await createCustomInput(proUserApiKey, eventType.id, "Custom Input", "42");

  const integration = "foogle_calendar";
  const externalId = `${Date.now()}`;
  await createSelectedCalendar(proUserApiKey, integration, externalId);

  // const destinationCalendar = await createDestinationCalendar(proUserApiKey, integration, externalId);
  const webhook = await createWebhook(
    proUserApiKey,
    `http://localhost:4242/fake-webhook-${Date.now()}`,
    ["BOOKING_CREATED"],
    false
  );

  return {
    userId: me.id,
    teamId: teams[0].id,
    scheduleId: schedules[0].id,
    availabilityId: schedules[0].availability[0].id,
    bookingId: bookings[0].id,
    bookingReferenceId: bookingReference.id,
    attendeeId: attendees[0].id,
    eventTypeId: eventType.id,
    customInputId: customInput.id,
    // destinationCalendarId: destinationCalendar.id,
    webhookId: webhook.id,
    externalId,
    integration,
  };
}
