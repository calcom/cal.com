// const hooks = require("hooks");
// const fs = require("fs");
// const path = require("path");
// const { getExistingIds } = require("./dredd-helpers/get-existing-ids.js");
// const { getTemporaryIds } = require("./dredd-helpers/get-temporary-ids.js");
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

let existingIds = {};
let temporaryIds = {};

// Get seed values from packages/prisma/dredd-data.json (generated at seed time)
const apiKeyFilePath = path.resolve(__dirname, "../../packages/prisma/dredd-data.json");
const apiKeyJson = fs.readFileSync(apiKeyFilePath, { encoding: "utf8" });
const parsedApiKeyJson = JSON.parse(apiKeyJson);

console.log({ parsedApiKeyJson });

const {
  proUserApiKey,
  proUserTeamApiKey,
  teamId,
  proUserId,
  proUserTeamId,
  deletableUserId,
  deletableUserApiKey,
} = parsedApiKeyJson;

hooks.beforeAll(async (transaction: Transaction, done: () => void) => {
  existingIds = await getExistingIds(proUserApiKey, proUserTeamApiKey);
  console.log("EXISTING", { existingIds });
  temporaryIds = await getTemporaryIds(proUserApiKey, proUserTeamApiKey);
  console.log("TEMPORARY", { temporaryIds });
  done();
});

// Skip tests that cannot be tested properly right now
const skippedTests = [
  "/destination-calendars > Find all destination calendars > 200",
  "/destination-calendars > Find all destination calendars > 401",
  "/destination-calendars > Find all destination calendars > 404",
  "/destination-calendars > Creates a new destination calendar > 201",
  "/destination-calendars > Creates a new destination calendar > 400",
  "/destination-calendars > Creates a new destination calendar > 401",
  "/destination-calendars/{id} > Remove an existing destination calendar > 200",
  "/destination-calendars/{id} > Remove an existing destination calendar > 401",
  "/destination-calendars/{id} > Remove an existing destination calendar > 404",
  "/destination-calendars/{id} > Find a destination calendar > 200",
  "/destination-calendars/{id} > Find a destination calendar > 401",
  "/destination-calendars/{id} > Find a destination calendar > 404",
  "/destination-calendars/{id} > Edit an existing destination calendar > 200",
  "/destination-calendars/{id} > Edit an existing destination calendar > 401",
  "/destination-calendars/{id} > Edit an existing destination calendar > 404",
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
  }

  if (transaction.origin.resourceName.indexOf("{teamId}")) {
    transaction.fullPath = transaction.fullPath.replace(`/${placeholderIds.teamId}`, `/${teamId}`);

    // We need different userIds and apiKeys based on whether the endpoint needs a team or not
    if (transaction.origin.resourceName.indexOf("{userId}")) {
      transaction.fullPath = transaction.fullPath.replace(`/${placeholderIds.userId}`, `/${proUserTeamId}`);
    }

    transaction.fullPath = transaction.fullPath.replace(
      "apiKey=1234abcd5678efgh",
      `apiKey=${proUserTeamApiKey}`
    );
  } else {
    if (transaction.origin.resourceName.indexOf("{userId}")) {
      transaction.fullPath = transaction.fullPath.replace(`/${placeholderIds.userId}`, `/${proUserId}`);
    }

    transaction.fullPath = transaction.fullPath.replace("apiKey=1234abcd5678efgh", `apiKey=${proUserApiKey}`);
  }
});

hooks.before("/users/{userId} > Remove an existing user > 201", (transaction: Transaction) => {
  transaction.fullPath = transaction.fullPath.replace(`/${placeholderIds.userId}`, `/${deletableUserId}`);
  transaction.fullPath = transaction.fullPath.replace(
    "apiKey=1234abcd5678efgh",
    `apiKey=${deletableUserApiKey}`
  );
});
