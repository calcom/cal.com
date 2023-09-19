import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";

const refreshOAuthTokens = async (refreshFunction: () => any, appSlug: string, userId: number | null) => {
  // Check that app syncing is enabled and that the credential belongs to a user
  if (APP_CREDENTIAL_SHARING_ENABLED && process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT && userId) {
    // Customize the payload based on what your endpoint requires
    // The response should only contain the access token and expiry date
    const response = await fetch(process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT, {
      method: "POST",
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
