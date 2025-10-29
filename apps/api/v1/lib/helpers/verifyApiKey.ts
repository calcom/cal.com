import type { NextMiddleware } from "next-api-middleware";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { PrismaApiKeyRepository } from "@calcom/lib/server/repository/PrismaApiKeyRepository";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { ApiKeyService } from "@calcom/lib/server/service/ApiKeyService";
import { prisma } from "@calcom/prisma";

import { isAdminGuard } from "../utils/isAdmin";
import { isLockedOrBlocked } from "../utils/isLockedOrBlocked";
import { ScopeOfAdmin } from "../utils/scopeOfAdmin";

// This verifies the apiKey and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  const deploymentRepo = new DeploymentRepository(prisma);
  const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
  const hasValidLicense = await licenseKeyService.checkLicense();

  if (!hasValidLicense && IS_PRODUCTION) {
    return res.status(401).json({ message: "Invalid or missing CALCOM_LICENSE_KEY environment variable" });
  }

  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  const hashedKey = hashAPIKey(strippedApiKey);

  // Use service layer for API key verification
  const apiKeyRepo = new PrismaApiKeyRepository(prisma);
  const apiKeyService = new ApiKeyService({ apiKeyRepo });
  const result = await apiKeyService.verifyKeyByHashedKey(hashedKey);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // save the user id in the request for later use
  req.userId = result.userId!;
  req.user = result.user!;

  const { isAdmin, scope } = await isAdminGuard(req);
  const userIsLockedOrBlocked = await isLockedOrBlocked(req);

  if (userIsLockedOrBlocked)
    return res.status(403).json({ error: "You are not authorized to perform this request." });

  req.isSystemWideAdmin = isAdmin && scope === ScopeOfAdmin.SystemWide;
  req.isOrganizationOwnerOrAdmin = isAdmin && scope === ScopeOfAdmin.OrgOwnerOrAdmin;

  await next();
};
