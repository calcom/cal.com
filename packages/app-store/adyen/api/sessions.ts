import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";

import { createPaymentSessionsInputSchema } from "../lib/types";
import { getAdyenCheckoutApiBaseUrl } from "./_adyenUrls";
import { getAdyenValidCredentialKeys } from "./_utils";

const log = logger.getSubLogger({ prefix: [`[adyen/api/sessions]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { organizerUserId, ...paymentSessionsPayload } = createPaymentSessionsInputSchema.parse(
      JSON.parse(req.body)
    );
    const keys = await getAdyenValidCredentialKeys(organizerUserId);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${keys?.access_token}`,
    };

    const body = { ...paymentSessionsPayload, merchantAccount: keys.merchant_account_id };

    const sessionsResponse = await fetch(`${getAdyenCheckoutApiBaseUrl(keys.live_url_prefix)}/sessions`, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    const result = await sessionsResponse.json();

    if (!sessionsResponse.ok) {
      const message = `Adyen /sessions api failed with status ${
        sessionsResponse.statusText
      }: ${JSON.stringify(result)}`;
      throw new Error(message);
    }

    return res.status(200).json(result);
  } catch (error) {
    log.error(error);
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
