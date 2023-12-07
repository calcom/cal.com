import {
  getMe,
  getAttendees,
  getBookingReferences,
  getBookings,
  getCustomInputs,
  getDestinationCalendars,
  getEventTypes,
  getSchedules,
  getSelectedCalendars,
  getTeams,
  getWebhooks,
} from "./getters";

// userId: 42,
// teamId: 1202,
// scheduleId: 1002,
// availabilityId: 201,
// bookingId: 301,
// bookingReferenceId: 401,
// attendeeId: 101,
// customInputId: 501,
// destinationCalendarId: 601,
// eventTypeId: 701,

// externalId: 1102,

// webhookId: 1302,

// paymentId: 901, // no list method, need to get value from seed script

export async function getExistingIds(apiKey: string) {
  const me = await getMe(apiKey);
  const teams = await getTeams(apiKey);
  const schedules = await getSchedules(apiKey);
  const bookings = await getBookings(apiKey);
  const bookingReferences = await getBookingReferences(apiKey);
  const attendees = await getAttendees(apiKey);
  const customInputs = await getCustomInputs(apiKey);
  const destinationCalendars = await getDestinationCalendars(apiKey);
  const eventTypes = await getEventTypes(apiKey);
  const webhooks = await getWebhooks(apiKey);

  const selectedCalendars = await getSelectedCalendars(apiKey);
  console.log({ selectedCalendars });
  const calendarIdParts = selectedCalendars[0].id.split("_");
  calendarIdParts.shift();
  const externalId = calendarIdParts.pop();
  const integrationId = calendarIdParts.join("_");

  return {
    userId: me.id,
    teamId: teams[0].id,
    scheduleId: schedules[0].id,
    availabilityId: schedules[0].availability[0].id,
    bookingId: bookings[0].id,
    bookingReferenceId: bookingReferences[0].id,
    attendeeId: attendees[0].id,
    customInputId: customInputs[0].id,
    destinationCalendarId: destinationCalendars[0].id,
    eventTypeId: eventTypes[0].id,
    webhookId: webhooks[0].id,
    externalId,
    integrationId: integrationId,
  };
}
