import { baseUrl } from "./constants";
import { getUsers } from "./getters";

export async function createUser(apiKey: string) {
  const email = "deleteme@example.com";
  const createResponse = await fetch(`${baseUrl}/users?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      username: "Delete Me",
    }),
  });

  const users = await getUsers(apiKey);

  // TODO: is there an interface we can use here?
  const deleteMeUser = users.find((user: any) => {
    return user.email === email;
  });

  return deleteMeUser;
}

export async function createTeam(apiKey: string) {
  const slug = `delete-me-team-${Date.now()}`;
  const response = await fetch(`${baseUrl}/teams?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      name: "Delete Me",
      isPrivate: false,
      hideBookATeamMember: false,
      brandColor: "#00FF00",
      darkBrandColor: "#FF00FF",
      timeZone: "America/Los_Angeles",
      weekStart: "Sunday",
    }),
  });

  const responseJson = await response.json();
  return responseJson.team;
}

export async function createSchedule(apiKey: string) {
  const response = await fetch(`${baseUrl}/schedules?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Delete This Schedule",
      timeZone: "America/Los_Angeles",
    }),
  });

  const responseJson = await response.json();
  return responseJson.schedule;
}

export async function createAvailability(apiKey: string, scheduleId: number) {
  const response = await fetch(`${baseUrl}/availabilities?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scheduleId,
      startTime: "1970-01-01T17:00:00.000Z",
      endTime: "2030-01-01T17:00:00.000Z",
    }),
  });

  const responseJson = await response.json();
  return responseJson.availability;
}

export async function createBooking(apiKey: string, eventTypeId: number, seatsPerTimeSlot = 0) {
  const response = await fetch(`${baseUrl}/bookings?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventTypeId,
      responses: {
        name: "Foo Bar",
        email: "foobar@example.com",
        location: {
          optionValue: "Email",
          value: "bazbot@example.com",
        },
      },
      language: "English",
      start: "2024-12-01T17:00:00.000Z",
      timeZone: "America/Los_Angeles",
      metadata: {},
      seatsPerTimeSlot,
    }),
  });

  const responseJson = await response.json();
  return responseJson;
}

export async function createBookingReference(
  apiKey: string,
  bookingId: number,
  uniqueIdentifier = `${Date.now()}`
) {
  const uid = `uid-${uniqueIdentifier}`;

  const bookingReferenceRequest = {
    // is this type meant to be a specific kind of type? Validation should probably be verifying that.
    type: "fooType",
    uid,
    bookingId,
  };

  const response = await fetch(`${baseUrl}/booking-references?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bookingReferenceRequest),
  });

  const responseBody = await response.json();

  return responseBody.booking_reference;
}

export async function createAttendee(apiKey: string, bookingId: number) {
  const attendeeRequest = {
    name: "Foo Bar",
    email: "foobar@example.com",
    timeZone: "America/Los_Angeles",
    bookingId,
  };

  const response = await fetch(`${baseUrl}/attendees?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(attendeeRequest),
  });

  const responseBody = await response.json();

  return responseBody.attendee;
}

export async function createEventType(
  apiKey: string,
  title: string,
  slug: string,
  lengthInMinutes = 30,
  metadata = {}
) {
  const eventTypeRequest = {
    title,
    slug,
    length: lengthInMinutes,
    metadata,
    seatsPerTimeSlot: 3,
  };

  const response = await fetch(`${baseUrl}/event-types?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventTypeRequest),
  });

  const responseBody = await response.json();

  return responseBody.event_type;
}

export async function createCustomInput(
  apiKey: string,
  eventTypeId: number,
  label: string,
  placeholder = "42",
  type = "NUMBER",
  required = false
) {
  const customInputRequest = {
    eventTypeId,
    label,
    type,
    placeholder,
    required,
    options: [],
  };

  const response = await fetch(`${baseUrl}/custom-inputs?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(customInputRequest),
  });

  const responseBody = await response.json();

  return responseBody.event_type_custom_input;
}

export async function createSelectedCalendar(
  apiKey: string,
  integration = "foogle_calendar",
  externalId = `${Date.now()}`
) {
  const selectedCalendarRequest = {
    integration,
    externalId,
  };

  const response = await fetch(`${baseUrl}/selected-calendars?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(selectedCalendarRequest),
  });

  const responseBody = await response.json();

  return responseBody.selected_calendar;
}

export async function createDestinationCalendar(apiKey: string, integration: string, externalId: string) {
  const credentialId = "foo";
  const destinationCalendarRequest = {
    integration,
    externalId,
    // credentialId,
  };

  const response = await fetch(`${baseUrl}/destination-calendars?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(destinationCalendarRequest),
  });

  const responseBody = await response.json();
  return responseBody.destinationCalendar;
}

export async function createWebhook(
  apiKey: string,
  subscriberUrl: string,
  eventTriggers: string[],
  active: boolean
) {
  const webhookRequest = {
    subscriberUrl,
    eventTriggers,
    active,
  };

  const response = await fetch(`${baseUrl}/webhooks?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(webhookRequest),
  });

  const responseBody = await response.json();

  return responseBody.webhook;
}
