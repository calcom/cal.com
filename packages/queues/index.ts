import { TriggerClient } from "@trigger.dev/sdk";

const projectId = process.env.TRIGGER_PROJECT_ID;
const apiKey = process.env.TRIGGER_API_KEY;
const apiUrl = process.env.TRIGGER_API_URL;

/**
 * This is the Trigger.dev client that is used to send and receive data from the Trigger.dev instance.
 *
 * If the environment variables are not set, then this will be null.
 *
 * Trigger.dev is an Open Source Background Jobs framework for TypeScript.\
 * Learn more at https://trigger.dev
 */
export const queue =
  projectId && apiKey && apiUrl
    ? new TriggerClient({
        id: projectId,
        apiKey,
        apiUrl,
      })
    : null;
