import type { SafeParseReturnType, z } from "zod";

import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { OAuth2UniversalSchema } from "../../_auth/universalSchema";
import { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "../../_auth/universalSchema";

const log = logger.getSubLogger({ prefix: ["refreshOAuthTokens"] });

async function getJson(response: Response) {
  const responseClone = response.clone();
  if (!response.ok || (response.status < 200 && response.status >= 300)) {
    throw Error(response.statusText);
  }
  // handle 204 response code with empty response (causes crash otherwise as "" is invalid JSON)
  if (response.status === 204) {
    return;
  }
  return responseClone.json();
}

const validateAndNormalizeToken = (
  token: SafeParseReturnType<z.infer<typeof OAuth2UniversalSchema>, z.infer<typeof OAuth2UniversalSchema>>
) => {
  const credentialSyncingEnabled =
    APP_CREDENTIAL_SHARING_ENABLED && process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;
  if (!token.success) {
    throw new Error("Invalid refreshed tokens were returned");
  }

  // What is this normalization for?
  if (!token.data.refresh_token && credentialSyncingEnabled) {
    token.data.refresh_token = "refresh_token";
  }
  return token.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const refreshOAuthTokens = async ({
  refreshFunction,
  appSlug,
  userId,
  checkIfResponseInvalidatesToken,
}: {
  refreshFunction: () => Promise<Response>;
  appSlug: string;
  userId: number | null;
  /**
   *  @param response The response from the refreshFunction
   * `response` is a clone of the original response, so it can be consumed again
   */
  checkIfResponseInvalidatesToken?: (response: Response) => Promise<boolean>;
}) => {
  let response;

  // Check that app syncing is enabled and that the credential belongs to a user
  if (
    APP_CREDENTIAL_SHARING_ENABLED &&
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT &&
    CREDENTIAL_SYNC_SECRET &&
    userId
  ) {
    log.debug(
      "Refreshing OAuth token from credential sync endpoint",
      safeStringify({
        appSlug,
        userId,
        endpoint: process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT,
      })
    );
    // Customize the payload based on what your endpoint requires
    // The response should only contain the access token and expiry date
    response = await fetch(process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        [CREDENTIAL_SYNC_SECRET_HEADER_NAME]: CREDENTIAL_SYNC_SECRET,
      },
      body: new URLSearchParams({
        calcomUserId: userId.toString(),
        appSlug,
      }),
    });
    log.debug("Response from credential sync endpoint", await response.clone().text());
  } else {
    response = await refreshFunction();
  }

  const json = getJsonFromResponse({ checkIfResponseInvalidatesToken, response });
  const token = validateAndNormalizeToken(
    OAuth2UniversalSchemaWithCalcomBackwardCompatibility.safeParse(json)
  );
  return token;
};

export async function getJsonFromResponse({
  checkIfResponseInvalidatesToken,
  response,
}: {
  checkIfResponseInvalidatesToken?: (response: Response) => Promise<boolean>;
  response: Response;
}) {
  if (checkIfResponseInvalidatesToken && (await checkIfResponseInvalidatesToken(response.clone()))) {
    return null;
  }

  return await getJson(response);
}

export default refreshOAuthTokens;
