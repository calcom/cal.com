import type { NextMiddleware } from "next-api-middleware";

import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "../utils/isAdmin";
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
  const licenseKeyService = await LicenseKeyService.create();
  const hasValidLicense = await licenseKeyService.checkLicense();

  if (!hasValidLicense && IS_PRODUCTION) {
    return res.status(401).json({ error: "Invalid or missing CALCOM_LICENSE_KEY environment variable" });
  }
  // Check if the apiKey query param is provided.
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });
  // remove the prefix from the user provided api_key. If no env set default to "cal_"
  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  // Hash the key again before matching against the database records.
  const hashedKey = hashAPIKey(strippedApiKey);
  // Check if the hashed api key exists in database.
  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey } });
  // If cannot find any api key. Throw a 401 Unauthorized.
  if (!apiKey) return res.status(401).json({ error: "Your apiKey is not valid" });
  if (apiKey.expiresAt && dateNotInPast(apiKey.expiresAt)) {
    return res.status(401).json({ error: "This apiKey is expired" });
  }
  if (!apiKey.userId) return res.status(404).json({ error: "No user found for this apiKey" });
  // save the user id in the request for later use
  req.userId = apiKey.userId;
  const { isAdmin, scope } = await isAdminGuard(req);

  req.isSystemWideAdmin = isAdmin && scope === ScopeOfAdmin.SystemWide;
  req.isOrganizationOwnerOrAdmin = isAdmin && scope === ScopeOfAdmin.OrgOwnerOrAdmin;

  await next();
};
