import fs from "fs";
// We must ignore this import because dredd creates this globally for us at runtime
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line
import hooks from "hooks";
import path from "path";

import { getExistingIds } from "./dredd-helpers/get-existing-ids";
import { getTemporaryIds } from "./dredd-helpers/get-temporary-ids";

// import type { Transaction } from "./dredd-helpers/types";

type Transaction = any;

const placeholderIds = {
  attendeeId: 101,
  availabilityId: 201,
  bookingId: 301,
  bookingReferenceId: 401,
  customInputId: 501,
  destinationCalendarId: 601,
  eventTypeId: 701,
  paymentId: 901, // no list method, need to get value from seed script
  scheduleId: 1002,
  externalId: 1102,
  teamId: 1202,
  webhookId: 1302,
  integration: "google_calendar",

  userId: 42,
};

let existingIds: Partial<typeof placeholderIds> = {};
let temporaryIds: Partial<typeof placeholderIds> = {};

// Get seed values from packages/prisma/dredd-data.json (generated at seed time)
const apiKeyFilePath = path.resolve(__dirname, "../../packages/prisma/dredd-data.json");
const apiKeyJson = fs.readFileSync(apiKeyFilePath, { encoding: "utf8" });
const parsedApiKeyJson = JSON.parse(apiKeyJson);

const {
  proUserApiKey,
  proUserTeamApiKey,
  teamId,
  proUserId,
  proUserTeamId,
  deletableUserId,
  deletableUserApiKey,
} = parsedApiKeyJson;

hooks.beforeAll(async (_transaction: Transaction, done: () => void) => {
  try {
    existingIds = await getExistingIds(proUserApiKey, proUserTeamApiKey);
    temporaryIds = await getTemporaryIds(proUserApiKey, proUserId, proUserTeamApiKey, proUserTeamId);
    done();
  } catch (e: any) {
    console.log("ERROR IN BEFORE ALL HOOK: ", e);
    throw e;
  }
});

// Skip tests that cannot be tested properly right now
const skippedTests = [
  // "/destination-calendars > Find all destination calendars > 200",
  // "/destination-calendars > Find all destination calendars > 401",
  "/destination-calendars > Find all destination calendars > 404",
  "/destination-calendars > Creates a new destination calendar > 201",
  "/destination-calendars > Creates a new destination calendar > 400",
  // "/destination-calendars > Creates a new destination calendar > 401",
  "/destination-calendars/{id} > Remove an existing destination calendar > 200",
  // "/destination-calendars/{id} > Remove an existing destination calendar > 401",
  "/destination-calendars/{id} > Remove an existing destination calendar > 404",
  "/destination-calendars/{id} > Find a destination calendar > 200",
  // "/destination-calendars/{id} > Find a destination calendar > 401",
  "/destination-calendars/{id} > Find a destination calendar > 404",
  "/destination-calendars/{id} > Edit an existing destination calendar > 200",
  // "/destination-calendars/{id} > Edit an existing destination calendar > 401",
  "/destination-calendars/{id} > Edit an existing destination calendar > 404",

  // "/memberships > Find all memberships > 401 > application/json; charset=utf-8",
  "/memberships > Find all memberships > 404",
  "/memberships > Creates a new membership > 201",
  "/memberships > Creates a new membership > 400",
  // "/memberships > Creates a new membership > 401 > application/json; charset=utf-8",
  "/memberships/{userId}_{teamId} > Remove an existing membership > 201",
  "/memberships/{userId}_{teamId} > Remove an existing membership > 400",
  "/memberships/{userId}_{teamId} > Remove an existing membership > 401 > application/json; charset=utf-8",
  "/memberships/{userId}_{teamId} > Find a membership by userID and teamID > 200",
  "/memberships/{userId}_{teamId} > Find a membership by userID and teamID > 401 > application/json; charset=utf-8",
  "/memberships/{userId}_{teamId} > Find a membership by userID and teamID > 404",
  "/memberships/{userId}_{teamId} > Edit an existing membership > 200",
  "/memberships/{userId}_{teamId} > Edit an existing membership > 400",
  "/memberships/{userId}_{teamId} > Edit an existing membership > 401 > application/json; charset=utf-8",

  "/payments/{id} > Find a payment > 200",
  // "/payments/{id} > Find a payment > 401 > application/json; charset=utf-8",
  "/payments/{id} > Find a payment > 404",
  "/payments > Find all payments > 200",
  // "/payments > Find all payments > 401 > application/json; charset=utf-8",
  "/payments > Find all payments > 404",

  // "/selected-calendars > Find all selected calendars > 401 > application/json; charset=utf-8",
  "/selected-calendars > Creates a new selected calendar > 201",
  "/selected-calendars > Creates a new selected calendar > 400",
  // "/selected-calendars > Creates a new selected calendar > 401 > application/json; charset=utf-8",
  "/selected-calendars/{userId}_{integration}_{externalId} > Remove a selected calendar > 201",
  "/selected-calendars/{userId}_{integration}_{externalId} > Remove a selected calendar > 400",
  // "/selected-calendars/{userId}_{integration}_{externalId} > Remove a selected calendar > 401 > application/json; charset=utf-8",
  "/selected-calendars/{userId}_{integration}_{externalId} > Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_` > 200",
  // "/selected-calendars/{userId}_{integration}_{externalId} > Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_` > 401 > application/json; charset=utf-8",
  "/selected-calendars/{userId}_{integration}_{externalId} > Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_` > 404",
  "/selected-calendars/{userId}_{integration}_{externalId} > Edit a selected calendar > 200",
  "/selected-calendars/{userId}_{integration}_{externalId} > Edit a selected calendar > 400",
  // "/selected-calendars/{userId}_{integration}_{externalId} > Edit a selected calendar > 401 > application/json; charset=utf-8",

  // "/users > Find all users. > 200",
  // "/users > Find all users. > 401 > application/json; charset=utf-8",
  "/users > Creates a new user > 201",
  "/users > Creates a new user > 400",
  // "/users > Creates a new user > 401 > application/json; charset=utf-8",
  "/users/{userId} > Remove an existing user > 201",
  "/users/{userId} > Remove an existing user > 400",
  // "/users/{userId} > Remove an existing user > 401 > application/json; charset=utf-8",
  // "/users/{userId} > Find a user, returns your user if regular user. > 200",
  // "/users/{userId} > Find a user, returns your user if regular user. > 401 > application/json; charset=utf-8",
  "/users/{userId} > Find a user, returns your user if regular user. > 404",
  "/users/{userId} > Edit an existing user > 200",
  "/users/{userId} > Edit an existing user > 400",
  // "/users/{userId} > Edit an existing user > 401",
  "/users/{userId} > Edit an existing user > 403",
];

// these endpoints need to handle their own logic rather than being globally interpolated
const skippedBeforeEachTests = ["/users/{userId} > Remove an existing user > 201"];

hooks.beforeEach((transaction: Transaction) => {
  // bail out of tests that need their own specific logic
  if (skippedBeforeEachTests.indexOf(transaction.name) > -1) {
    return;
  }

  if (skippedTests.indexOf(transaction.name) > -1) {
    transaction.skip = true;
    return;
  }

  if (transaction.expected.statusCode === "401") {
    transaction.fullPath = transaction.fullPath.replace("apiKey=1234abcd5678efgh", "apiKey=INVALID_API_KEY");
    return;
  }

  let NOT_FOUND_ID: number | null = null;
  if (transaction.expected.statusCode === "404") {
    NOT_FOUND_ID = 999;
  }

  Object.keys(placeholderIds)
    .filter((key) => ["userId", "teamId", "integration", "externalId"].indexOf(key) === -1)
    .forEach((key) => {
      const placeholderKey = key as unknown as keyof typeof placeholderIds;

      const replacementId =
        transaction.request.method === "DELETE" ? temporaryIds[placeholderKey] : existingIds[placeholderKey];

      transaction.fullPath = transaction.fullPath.replace(
        `/${placeholderIds[placeholderKey]}`,
        `/${NOT_FOUND_ID ?? replacementId}`
      );
    });

  // We need different userIds and apiKeys based on whether the endpoint needs a team or not
  let userId = proUserId;
  let apiKey = proUserApiKey;

  if (transaction.origin.resourceName.indexOf("{teamId}") > -1) {
    userId = proUserTeamId;
    apiKey = proUserTeamApiKey;

    const replacementTeamId = transaction.request.method === "DELETE" ? temporaryIds.teamId : teamId;

    transaction.fullPath = transaction.fullPath.replace(
      `/${placeholderIds.teamId}`,
      `/${NOT_FOUND_ID ?? replacementTeamId}`
    );
  }

  if (transaction.origin.resourceName.indexOf("{userId}") > -1) {
    transaction.fullPath = transaction.fullPath.replace(
      `/${placeholderIds.userId}`,
      `/${NOT_FOUND_ID ?? userId}`
    );
  }

  transaction.fullPath = transaction.fullPath.replace("apiKey=1234abcd5678efgh", `apiKey=${apiKey}`);
});

hooks.before("/attendees > Creates a new attendee > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    bookingId: existingIds.bookingId,
    email: "foobar@example.com",
    name: "Foo Bar",
    timeZone: "America/Los_Angeles",
  });
});

hooks.before("/attendees/{id} > Edit an existing attendee > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    email: "foobar2@example.com",
    name: "Foo Bar 2",
  });
});

hooks.before("/availabilities > Creates a new availability > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    scheduleId: existingIds.scheduleId,
    startTime: "1970-01-01T17:00:00.000Z",
    endTime: "2030-01-01T17:00:00.000Z",
  });
});

hooks.before("/availabilities/{id} > Edit an existing availability > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    startTime: "1971-01-01T17:00:00.000Z",
    endTime: "2031-01-01T17:00:00.000Z",
  });
});

hooks.before("/booking-references > Creates a new  booking reference > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    bookingId: existingIds.bookingId,
    type: "fooType",
    uid: `uid-${Date.now()}`,
  });
});

hooks.before(
  "/booking-references/{id} > Edit an existing booking reference > 200",
  (transaction: Transaction) => {
    transaction.request.body = JSON.stringify({
      type: "fooType42",
      uid: `uid-${Date.now()}`,
    });
  }
);

hooks.before(
  "/bookings > Creates a new booking > 201 > application/json; charset=utf-8",
  (transaction: Transaction) => {
    transaction.request.body = JSON.stringify({
      eventTypeId: existingIds.eventTypeId,
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
      seatsPerTimeSlot: 3,
    });
  }
);

hooks.before(
  "/bookings/{id} > Edit an existing booking > 200 > application/json; charset=utf-8",
  (transaction: Transaction) => {
    transaction.request.body = JSON.stringify({
      title: "A changed Booking title",
    });
  }
);

hooks.before("/custom-inputs > Creates a new eventTypeCustomInput > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    eventTypeId: existingIds.eventTypeId,
    label: "Custom Input",
    type: "NUMBER",
    placeholder: "42",
    required: false,
    options: [],
  });
});

hooks.before(
  "/custom-inputs/{id} > Edit an existing eventTypeCustomInput > 200",
  (transaction: Transaction) => {
    transaction.request.body = JSON.stringify({
      label: "Edited Custom Input",
    });
  }
);

hooks.before("/event-types > Creates a new event type > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    title: "New Event Type",
    slug: `new-event-type-${Date.now()}`,
    length: 30,
    metadata: {},
    seatsPerTimeSlot: 3,
  });
});

hooks.before("/event-types/{id} > Edit an existing eventType > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    title: "Edited New Event Type",
  });
});

hooks.before("/schedules > Creates a new schedule > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    name: "New Schedule",
    timeZone: "America/Los_Angeles",
  });
});

hooks.before("/schedules/{id} > Edit an existing schedule > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    title: "Edited Schedule",
  });
});

hooks.before("/selected-calendars > Creates a new selected calendar > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    integration: "foogle_calendar",
    externalId: `${Date.now()}`,
  });
});

hooks.before("/selected-calendars/{id} > Edit a selected calendar > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    title: "Edited Schedule",
  });
});

hooks.before("/teams > Creates a new team > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    slug: `new-team-${Date.now()}`,
    name: "New Team",
    isPrivate: false,
    hideBookATeamMember: false,
    brandColor: "#00FF00",
    darkBrandColor: "#FF00FF",
    timeZone: "America/Los_Angeles",
    weekStart: "Sunday",
  });
});

hooks.before("/teams/{teamId} > Edit an existing team > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    name: "Edited Team",
  });
});

hooks.before("/webhooks > Creates a new webhook > 201", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    subscriberUrl: `http://localhost:4242/foo-${Date.now()}`,
    eventTriggers: ["BOOKING_CREATED"],
    active: false,
  });
});

hooks.before("/webhooks/{id} > Edit an existing webhook > 200", (transaction: Transaction) => {
  transaction.request.body = JSON.stringify({
    subscriberUrl: `http://localhost:4242/foo-edited-${Date.now()}`,
  });
});

hooks.before("/users/{userId} > Remove an existing user > 201", (transaction: Transaction) => {
  transaction.fullPath = transaction.fullPath.replace(`/${placeholderIds.userId}`, `/${deletableUserId}`);
  transaction.fullPath = transaction.fullPath.replace(
    "apiKey=1234abcd5678efgh",
    `apiKey=${deletableUserApiKey}`
  );
});
