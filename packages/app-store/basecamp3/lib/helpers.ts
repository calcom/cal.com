import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { BasecampToken } from "./CalendarService";
import { getBasecampKeys } from "./getBasecampKeys";

export const refreshAccessToken = async (credential: CredentialPayload) => {
  const { client_id: clientId, client_secret: clientSecret, user_agent: userAgent } = await getBasecampKeys();
  const credentialKey = credential.key as BasecampToken;
  const tokenInfo = await fetch(
    `https://launchpad.37signals.com/authorization/token?type=refresh&refresh_token=${credentialKey.refresh_token}&client_id=${clientId}&redirect_uri=${WEBAPP_URL}&client_secret=${clientSecret}`,
    { method: "POST", headers: { "User-Agent": userAgent } }
  );
  const tokenInfoJson = await tokenInfo.json();
  tokenInfoJson["expires_at"] = Date.now() + 1000 * 3600 * 24 * 14;
  const newCredential = await prisma.credential.update({
    where: { id: credential.id },
    data: {
      key: { ...credentialKey, ...tokenInfoJson },
    },
  });
  return newCredential.key;
};
