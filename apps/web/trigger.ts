import { TriggerClient } from "@trigger.dev/sdk";

const apiKey = process.env.TRIGGER_API_KEY;
const apiUrl = process.env.TRIGGER_API_URL;

if (!apiKey) {
  throw new Error("TRIGGER_API_KEY is not set");
}

if (!apiUrl) {
  throw new Error("TRIGGER_API_URL is not set");
}

export const client = new TriggerClient({
  id: "calcom-BFXo",
  apiKey,
  apiUrl,
});
