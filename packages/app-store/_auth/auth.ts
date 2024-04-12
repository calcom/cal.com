import type { CredentialPayload } from "@calcom/types/Credential";

import refreshOAuthTokens from "../_utils/oauth/refreshOAuthTokens";

export const authInterface = ({
  clientCredentials,
  credential,
  appSlug: slug,
  checkIfResponseInvalidatesToken,
}: {
  clientCredentials: {
    client_id: string;
    client_secret: string;
  };
  credential: CredentialPayload;
  appSlug: string;
  checkIfResponseInvalidatesToken: (response: Response) => Promise<boolean>;
}) => {
  const refreshAccessToken = async (refreshToken: string) => {
    const { client_id, client_secret } = clientCredentials;
    const authHeader = `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`;

    const token = await refreshOAuthTokens({
      refreshFunction: async () =>
        fetch("https://zoom.us/oauth/token", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        }),
      appSlug: slug,
      userId: credential.userId,
      checkIfResponseInvalidatesToken,
    });

    if (!token) {
      await invalidateCredential(credential.id);
      return Promise.reject(new Error("Invalid grant for Cal.com zoom app"));
    }

    // We check the if the new credentials matches the expected response structure
    const newTokens = token;

    const key = credential.key;
    key.access_token = newTokens.access_token ?? key.access_token;
    key.refresh_token = (newTokens.refresh_token as string) ?? key.refresh_token;
    // set expiry date as offset from current time.
    key.expiry_date =
      typeof newTokens.expires_in === "number"
        ? Math.round(Date.now() + newTokens.expires_in * 1000)
        : key.expiry_date;
    // Store new tokens in database.
    await prisma.credential.update({
      where: { id: credential.id },
      data: { key: { ...key, ...newTokens } },
    });
    return newTokens.access_token;
  };

  return {
    getToken: async () => {
      const credentialKey = credential.key as ZoomToken;

      return isTokenValid(credentialKey)
        ? Promise.resolve(credentialKey.access_token)
        : refreshAccessToken(credentialKey.refresh_token);
    },
  };
};
