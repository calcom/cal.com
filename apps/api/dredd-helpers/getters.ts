import { baseUrl } from "~/dredd-helpers/constants";

export async function getMe(apiKey: string) {
  const response = await fetch(`${baseUrl}/me?apiKey=${apiKey}`);
  const { user: me } = await response.json();
  return me;
}

export async function getUsers(apiKey: string) {
  const response = await fetch(`${baseUrl}/users?apiKey=${apiKey}`);
  const { users } = await response.json();
  return users;
}

export async function getTeams(apiKey: string) {
  const response = await fetch(`${baseUrl}/teams?apiKey=${apiKey}`);
  const { teams } = await response.json();
  return teams;
}

export async function getSchedules(apiKey: string) {
  const response = await fetch(`${baseUrl}/schedules?apiKey=${apiKey}`);
  const { schedules } = await response.json();
  return schedules;
}

export async function getBookings(apiKey: string) {
  const response = await fetch(`${baseUrl}/bookings?apiKey=${apiKey}`);
  const { bookings } = await response.json();
  return bookings;
}

export async function getBookingReferences(apiKey: string) {
  const response = await fetch(`${baseUrl}/booking-references?apiKey=${apiKey}`);
  const { booking_references: bookingReferences } = await response.json();
  return bookingReferences;
}

export async function getAttendees(apiKey: string) {
  const response = await fetch(`${baseUrl}/attendees?apiKey=${apiKey}`);
  const { attendees } = await response.json();
  return attendees;
}

export async function getCustomInputs(apiKey: string) {
  const response = await fetch(`${baseUrl}/custom-inputs?apiKey=${apiKey}`);
  const { event_type_custom_inputs: customInputs } = await response.json();
  return customInputs;
}

export async function getDestinationCalendars(apiKey: string) {
  const response = await fetch(`${baseUrl}/destination-calendars?apiKey=${apiKey}`);
  const { destinationCalendars } = await response.json();
  return destinationCalendars;
}

export async function getEventTypes(apiKey: string) {
  const response = await fetch(`${baseUrl}/event-types?apiKey=${apiKey}`);
  const { event_types: eventTypes } = await response.json();
  return eventTypes;
}

export async function getSelectedCalendars(apiKey: string) {
  const response = await fetch(`${baseUrl}/selected-calendars?apiKey=${apiKey}`);
  const { selected_calendars: selectedCalendars } = await response.json();
  return selectedCalendars;
}

export async function getWebhooks(apiKey: string) {
  const response = await fetch(`${baseUrl}/webhooks?apiKey=${apiKey}`);
  const { webhooks } = await response.json();
  return webhooks;
}
