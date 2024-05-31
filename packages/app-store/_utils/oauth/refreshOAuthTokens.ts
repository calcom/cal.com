import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const refreshOAuthTokens = async (refreshFunction: () => any, appSlug: string, userId: number | null) => {
  // Check that app syncing is enabled and that the credential belongs to a user
  if (
    APP_CREDENTIAL_SHARING_ENABLED &&
    process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT &&
    CREDENTIAL_SYNC_SECRET &&
    userId
  ) {
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
    return response;
  } else {
    const response = await refreshFunction();
    return response;
  }
};

export default refreshOAuthTokens;
