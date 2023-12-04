const hooks = require("hooks");
const fs = require("fs");
const path = require("path");

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

  userId: 42,
};

// TODO: Get existing IDs from API.
const existingIds = {};

// TODO: Create Ids that can be deleted.
const temporaryIds = {};

// Get seed values from packages/prisma/dredd-data.json (generated at seed time)
const apiKeyFilePath = path.resolve(__dirname, "../../packages/prisma/dredd-data.json");
const apiKeyJson = fs.readFileSync(apiKeyFilePath, { encoding: "utf8" });
const parsedApiKeyJson = JSON.parse(apiKeyJson);
const { apiKey, teamId, userId } = parsedApiKeyJson;

hooks.beforeEach((transaction) => {
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
