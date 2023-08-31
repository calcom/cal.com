import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";

const refreshOAuthTokens = async (refreshFunction: () => any, userId: number, appSlug: string) => {
  // Check that app syncing is enabled
  if (APP_CREDENTIAL_SHARING_ENABLED && process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT) {
    // Customize the payload based on what your endpoint requires
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
