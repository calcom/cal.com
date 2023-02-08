import { NextMiddleware } from "next-api-middleware";

import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import checkLicense from "@calcom/features/ee/common/server/checkLicense";

import { isAdminGuard } from "~/lib/utils/isAdmin";

// Used to check if the apiKey is not expired, could be extracted if reused. but not for now.
export const dateNotInPast = function (date: Date) {
  const now = new Date();
  if (now.setHours(0, 0, 0, 0) > date.setHours(0, 0, 0, 0)) {
    return true;
  }
};

// This verifies the apiKey and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  const { prisma, isCustomPrisma, isAdmin } = req;
  const hasValidLicense = await checkLicense(prisma);
  if (!hasValidLicense)
    return res.status(401).json({ error: "Invalid or missing CALCOM_LICENSE_KEY environment variable" });
  // If the user is an admin and using a license key (from customPrisma), skip the apiKey check.
  if (isCustomPrisma && isAdmin) {
    await next();
    return;
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
  // save the isAdmin boolean here for later use
  req.isAdmin = await isAdminGuard(req);
  req.isCustomPrisma = false;
  await next();
};
