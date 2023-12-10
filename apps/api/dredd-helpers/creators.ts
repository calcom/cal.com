import { baseUrl } from "./constants";
import { getTeams, getUsers } from "./getters";

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

  console.log("createResponse", createResponse.status);

  const users = await getUsers(apiKey);

  // TODO: is there an interface we can use here?
  const deleteMeUser = users.find((user: any) => {
    return user.email === email;
  });

  return deleteMeUser;
}

export async function createTeam(apiKey: string) {
  const slug = "delete-me-team";
  await fetch(`${baseUrl}/teams?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      teamname: "Delete Me",
    }),
  });

  const teams = await getTeams(apiKey);

  // TODO: is there an interface we can use here?
  const deleteMeTeam = teams.find((team: any) => {
    return team.slug === slug;
  });

  return deleteMeTeam;
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

export async function createEventType(
  apiKey: string,
  title: string,
  slug: string,
  lengthInMinutes: number,
  metadata = {}
) {
  const eventTypeRequest = {
    title,
    slug,
    length: lengthInMinutes,
    metadata,
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

  console.log("DESTINATION CALENDAR", response.status, { responseBody });

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
