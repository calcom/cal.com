import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

import type { CreatePaymentSessionsInput } from "./types";

const log = logger.getSubLogger({ prefix: [`[[adyen/lib/createPaymentSession]`] });

export default async function createPaymentSession(
  input: Omit<CreatePaymentSessionsInput, "merchantAccount">
) {
  try {
    const sessionsPayload = {
      ...input,
      channel: "Web",
    };
    const response = await fetch(`${WEBAPP_URL}/api/integrations/adyen/sessions`, {
      method: "POST",
      body: JSON.stringify(sessionsPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = `API /api/integrations/adyen/sessions failed with status ${
        response.statusText
      }: ${JSON.stringify(result)}`;
      throw new Error(message);
    }

    return result;
  } catch (error) {
    log.error(error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Something went wrong");
  }
}
