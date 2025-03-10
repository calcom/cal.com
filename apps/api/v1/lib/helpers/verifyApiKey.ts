import type { NextMiddleware } from "next-api-middleware";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "../utils/isAdmin";
import { isLockedOrBlocked } from "../utils/isLockedOrBlocked";
import { ScopeOfAdmin } from "../utils/scopeOfAdmin";

// Used to check if the apiKey is not expired, could be extracted if reused. but not for now.
export const dateNotInPast = function (date: Date) {
  const now = new Date();
  if (now.setHours(0, 0, 0, 0) > date.setHours(0, 0, 0, 0)) {
    return true;
  }
};

// This verifies the apiKey and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  const licenseKeyService = await LicenseKeySingleton.getInstance();
  const hasValidLicense = await licenseKeyService.checkLicense();

  if (!hasValidLicense && IS_PRODUCTION) {
    return res.status(401).json({ error: "Invalid or missing CALCOM_LICENSE_KEY environment variable" });
  }

  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  const hashedKey = hashAPIKey(strippedApiKey);
  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    include: {
      user: {
        select: { role: true, locked: true, email: true },
      },
    },
  });
  if (!apiKey) return res.status(401).json({ error: "Your API key is not valid." });
  if (apiKey.expiresAt && dateNotInPast(apiKey.expiresAt)) {
    return res.status(401).json({ error: "This API key is expired." });
  }
  if (!apiKey.userId || !apiKey.user)
    return res.status(404).json({ error: "No user found for this API key." });

  // save the user id in the request for later use
  req.userId = apiKey.userId;
  req.user = apiKey.user;

  const { isAdmin, scope } = await isAdminGuard(req);
  const userIsLockedOrBlocked = await isLockedOrBlocked(req);

  if (userIsLockedOrBlocked)
    return res.status(403).json({ error: "You are not authorized to perform this request." });

  req.isSystemWideAdmin = isAdmin && scope === ScopeOfAdmin.SystemWide;
  req.isOrganizationOwnerOrAdmin = isAdmin && scope === ScopeOfAdmin.OrgOwnerOrAdmin;

  await next();
};
