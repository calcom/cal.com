import type { NextMiddleware } from "next-api-middleware";

import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";

export const verifyCredentialSyncEnabled: NextMiddleware = async (req, res, next) => {
  const { isSystemWideAdmin } = req;

  if (!isSystemWideAdmin) {
    return res.status(403).json({ error: "Only admin API keys can access credential syncing endpoints" });
  }

  if (!APP_CREDENTIAL_SHARING_ENABLED) {
    return res.status(501).json({ error: "Credential syncing is not enabled" });
  }

  if (
    req.headers[process.env.CALCOM_CREDENTIAL_SYNC_HEADER_NAME || "calcom-credential-sync-secret"] !==
    process.env.CALCOM_CREDENTIAL_SYNC_SECRET
  ) {
    return res.status(401).json({ message: "Invalid credential sync secret" });
  }

  await next();
};
