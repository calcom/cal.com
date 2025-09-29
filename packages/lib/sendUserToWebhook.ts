import logger from "@calcom/lib/logger";

import { IS_PROD_DOMAIN } from "./constants";

const log = logger.getSubLogger({ prefix: ["sendUserToMakeWebhook"] });

export const sendUserToMakeWebhook = async (userData: {
  id: number;
  email: string;
  name: string;
  username?: string;
  identityProvider: string;
  createdAt?: Date;
}) => {
  try {
    if (!IS_PROD_DOMAIN) {
      log.info("Not sending user data to Make webhook in non-prod environment");
      return;
    }
    const MAKE_SIGNUP_WEBHOOK_URL = process.env.MAKE_SIGNUP_WEBHOOK_URL;
    if (!MAKE_SIGNUP_WEBHOOK_URL) {
      log.error("MAKE_SIGNUP_WEBHOOK_URL is not defined");
      throw new Error("MAKE_SIGNUP_WEBHOOK_URL is not defined");
    }

    const response = await fetch(MAKE_SIGNUP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        username: userData.username,
        identityProvider: userData.identityProvider,
        createdAt: userData.createdAt || new Date(),
      }),
    });

    if (!response.ok) {
      log.error(`Failed to send user data to Make webhook: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to send user data to Make webhook: ${response.status} ${response.statusText}`);
    }

    // Handle plain text or JSON response
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    console.log("in_here_data", data);
    log.info(`Successfully sent user data to Make webhook: ${JSON.stringify(data)}`);
  } catch (error) {
    log.error(`Error sending user data to Make webhook: ${error}`);
    throw new Error(`Error sending user data to Make webhook: ${error}`);
  }
};
