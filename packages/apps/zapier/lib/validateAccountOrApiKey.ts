import type { NextApiRequest } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { HttpError } from "@calcom/lib/http-error";

export async function validateAccountOrApiKey(req: NextApiRequest, requiredScopes: string[] = []) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    const authorizedAccount = await isAuthorized(req, requiredScopes);
    if (!authorizedAccount) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
    return { account: authorizedAccount, appApiKey: undefined };
  }

  const validKey = await findValidApiKey(apiKey, "zapier");
  if (!validKey) throw new HttpError({ statusCode: 401, message: "API key not valid" });
  return { account: null, appApiKey: validKey };
}
