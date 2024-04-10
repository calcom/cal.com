import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["refreshOAuthTokens"] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const refreshOAuthTokens = async (refreshFunction: () => any, appSlug: string, userId: number | null) => {
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
    const response = await fetch(process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT, {
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
    return await response.json();
  } else {
    const response = await refreshFunction();
    return response;
  }
};

export default refreshOAuthTokens;
