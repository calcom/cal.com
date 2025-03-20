import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { ADYEN_MANAGEMENT_API_BASE_URL, ADYEN_OAUTH_API_BASE_URL } from "./_adyenUrls";

const log = logger.getSubLogger({ prefix: [`[adyen/api/callback]`] });

const adyenCallbackInputSchema = z.object({
  authorizationCode: z.string(),
  stateCallback: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string(),
  initialState: z.string(),
  codeVerifier: z.string(),
});

//see https://docs.adyen.com/development-resources/oauth/integration
//see https://docs.adyen.com/development-resources/oauth/scopes/#integrating-online-payments-using-oauth
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let accessToken: string;
  let expiresAt: number;
  let merchantAccountId: string;
  let clientKey: string;
  let liveUrlPrefix: string;
  let refreshToken: string;
  let webhookId: string;
  let hmacKey: string;

  const input = adyenCallbackInputSchema.parse(JSON.parse(req.body));
  const fetcher = async (baseUrl: string, endpoint: string, init?: RequestInit | undefined) => {
    return fetch(`${baseUrl}${endpoint}`, {
      method: "get",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init?.headers,
      },
    });
  };

  try {
    if (input.initialState !== input.stateCallback) {
      const message = "Callback state not matching initial state.";
      log.error(message);
      throw new Error(message);
    }

    //Get accessToken, expiresIn, refreshToken - required to access Adyen APIs
    //see https://docs.adyen.com/development-resources/oauth/integration/#step-3-get-your-access-and-refresh-tokens
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
    };
    const tokenReqBody = new URLSearchParams();
    tokenReqBody.append("grant_type", "authorization_code");
    tokenReqBody.append("code", input.authorizationCode);
    tokenReqBody.append("code_verifier", input.codeVerifier);
    tokenReqBody.append("redirect_uri", input.redirectUri);
    const tokenResponse = await fetch(`${ADYEN_OAUTH_API_BASE_URL}/token`, {
      method: "POST",
      headers,
      body: tokenReqBody,
    });
    const result = await tokenResponse.json();
    if (!tokenResponse.ok) {
      const message = `Access token request failed with status ${tokenResponse.statusText}: ${safeStringify(
        result
      )}`;
      log.error(message);
      throw new Error(message);
    }
    const { access_token, expires_in, refresh_token, accounts } = result;
    accessToken = access_token;
    expiresAt = Math.floor(Date.now() / 1000) + Number(expires_in); //since expires_in is in secs
    merchantAccountId = accounts[0];
    refreshToken = refresh_token;

    //Add calcom url as allowed origin in adyen
    //see https://docs.adyen.com/development-resources/oauth/scopes/#step-1-add-allowed-origins
    const allowedOriginReqBody = {
      domain: `${WEBAPP_URL}`,
    };
    const addAllowedOriginResp = await fetcher(ADYEN_MANAGEMENT_API_BASE_URL, `/me/allowedOrigins`, {
      method: "POST",
      body: JSON.stringify(allowedOriginReqBody),
    });
    const addAllowedOriginResult = await addAllowedOriginResp.json();
    if (!addAllowedOriginResp.ok) {
      const message = `Adding allowedOrigin request failed with status ${
        addAllowedOriginResp.statusText
      }: ${safeStringify(addAllowedOriginResult)}`;
      log.error(message);
      throw new Error(message);
    }

    //Get clientKey to use Adyen 'drop-in' UI component.
    //see https://docs.adyen.com/development-resources/oauth/scopes/#step-2-generate-a-client-key
    const clientKeyResponse = await fetcher(ADYEN_MANAGEMENT_API_BASE_URL, `/me/generateClientKey`, {
      method: "POST",
    });
    const clientKeyResult = await clientKeyResponse.json();
    if (!clientKeyResponse.ok) {
      const message = `Generate clientKey request failed with status ${
        clientKeyResponse.statusText
      }: ${safeStringify(clientKeyResult)}`;
      log.error(message);
      throw new Error(message);
    }
    clientKey = clientKeyResult.clientKey as string;

    //Get liveUrl to use in production.
    //see https://docs.adyen.com/development-resources/oauth/scopes/#step-3-retrieve-your-url-prefix
    const liveUrlResponse = await fetcher(ADYEN_MANAGEMENT_API_BASE_URL, `/merchants/${merchantAccountId}`, {
      method: "GET",
    });
    const liveUrlResult = await liveUrlResponse.json();
    if (!liveUrlResponse.ok) {
      const message = `Fetch liveUrlPrefix request failed with status ${
        liveUrlResponse.statusText
      }: ${safeStringify(liveUrlResult)}`;
      log.error(message);
      throw new Error(message);
    }
    liveUrlPrefix = liveUrlResult.dataCenters[0]?.livePrefix as string;

    //Setup Webhook to recieve notification on payment status
    //see https://docs.adyen.com/api-explorer/Management/3/post/merchants/(merchantId)/webhooks
    const webhookSetupReqBody = {
      active: true,
      communicationFormat: "json",
      type: "standard",
      url: `${WEBAPP_URL}/api/integrations/adyen/webhook`,
    };
    const webhookSetupResponse = await fetcher(
      ADYEN_MANAGEMENT_API_BASE_URL,
      `/merchants/${merchantAccountId}/webhooks`,
      {
        method: "POST",
        body: JSON.stringify(webhookSetupReqBody),
      }
    );
    const webhookSetupResult = await webhookSetupResponse.json();
    if (!webhookSetupResponse.ok) {
      const message = `Create webhook request failed with status ${
        webhookSetupResponse.statusText
      }: ${safeStringify(webhookSetupResult)}`;
      log.error(message);
      throw new Error(message);
    }
    webhookId = webhookSetupResult.id as string;

    //Generate hmacKey for webhook, to verify integrity of webhook notification origin
    //see https://docs.adyen.com/api-explorer/Management/3/post/merchants/(merchantId)/webhooks/(webhookId)/generateHmac
    const hmacKeyResponse = await fetcher(
      ADYEN_MANAGEMENT_API_BASE_URL,
      `/merchants/${merchantAccountId}/webhooks/${webhookId}/generateHmac`,
      {
        method: "POST",
      }
    );
    const hmacKeyResult = await hmacKeyResponse.json();
    if (!hmacKeyResponse.ok) {
      const message = `Generate hmackey failed with status ${hmacKeyResponse.statusText}: ${safeStringify(
        hmacKeyResult
      )}`;
      log.error(message);
      throw new Error(message);
    }
    hmacKey = hmacKeyResult.hmacKey as string;

    return res.status(200).json({
      access_token: accessToken,
      expires_at: expiresAt,
      refresh_token: refreshToken,
      merchant_account_id: merchantAccountId,
      client_key: clientKey,
      live_url_prefix: liveUrlPrefix,
      webhook_id: webhookId,
      hmac_key: hmacKey,
    });
  } catch (error) {
    log.error(error);
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
