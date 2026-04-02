/**
 * How to verify that rate limit is different for different impersonated users?
 * Open two terminals
 * Terminal 1: Run `node rate-limit-test-google-service-account-impersonation.js email1@cal.com 1000` - This makes email1 hit the limit. 1000 is much more than 600, so it gives more reliability in reaching the limit.
 * Terminal 1: Run `node rate-limit-test-google-service-account-impersonation.js email1@cal.com 100` - Verify that email1 is still hitting the limit
 * // Run this immediately after the above commands
 * Terminal 2: Run `node rate-limit-test-google-service-account-impersonation.js email2@cal.com 100` - Check for email2's limit, it should not hit the limit
 */
import process from "node:process";
const { calendar_v3 } = require("@googleapis/calendar");
const { JWT } = require("googleapis-common");

// client_email in the service account key json file
const serviceAccountClientEmail = "";
// private_key in the service account key json file
const serviceAccountPrivateKey = ``;

if (!serviceAccountClientEmail || !serviceAccountPrivateKey) {
  throw new Error("serviceAccountClientEmail and serviceAccountPrivateKey must be set");
}

async function sendRequest(calendar) {
  const response = await calendar.calendarList.list({
    fields: `items(id),nextPageToken`,
  });
  console.log(response.data);
}
const args = process.argv.slice(2);
const emailToImpersonate = args[0];
const totalRequestsArg = args[1];
(async () => {
  console.log({ emailToImpersonate, totalRequestsArg });
  const authClient = new JWT({
    email: serviceAccountClientEmail,
    key: serviceAccountPrivateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    subject: emailToImpersonate,
  });

  await authClient.authorize();
  const calendar = new calendar_v3.Calendar({
    auth: authClient,
  });

  // 600 requests per minute is the API limit per user
  const totalRequests = parseInt(totalRequestsArg) || 600;
  const promises = [];
  for (let i = 0; i < totalRequests; i++) {
    console.log(`Queuing request ${i + 1}/${totalRequests}`);
    promises.push(sendRequest(calendar));
  }
  await Promise.all(promises);
  console.log("All requests completed");
})();
