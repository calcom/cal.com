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
import type { Transaction } from "./dredd-helpers/types";

const placeholderIds = {
  attendeeId: 101,
  availabilityId: 201,
  bookingId: 301,
  bookingReferenceId: 401,
  customInputId: 501,
  destinationCalendarId: 601,
  eventTypeId: 701,
  paymentId: 901,
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
const { apiKey, teamId, userId } = parsedApiKeyJson;

hooks.beforeAll(async (transaction: Transaction, done: () => void) => {
  existingIds = await getExistingIds(apiKey);
  temporaryIds = await getTemporaryIds(apiKey);
  console.log({ existingIds });
  done();
});

hooks.beforeEach((transaction: Transaction) => {
  if (transaction.origin.resourceName.indexOf("{teamId}")) {
    transaction.request.uri = transaction.request.uri.replace(`/${placeholderIds.teamId}`, `/${teamId}`);
  }

  if (transaction.origin.resourceName.indexOf("{userId}")) {
    transaction.request.uri = transaction.request.uri.replace(`/${placeholderIds.userId}`, `/${userId}`);
  }

  if (transaction.expected.statusCode === "401") {
    transaction.request.uri = transaction.request.uri.replace(
      "apiKey=1234abcd5678efgh",
      "apiKey=INVALID_API_KEY"
    );
  } else {
    transaction.request.uri = transaction.request.uri.replace("apiKey=1234abcd5678efgh", `apiKey=${apiKey}`);
  }

  // console.log("URI: ", transaction);
});
