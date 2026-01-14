import retrieveValidApiKey from "@calid/features/modules/api-keys/utils/retrieveValidApiKey";
import type { NextApiRequest } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import { HttpError } from "@calcom/lib/http-error";

export async function validateAccountOrApiKey(req: NextApiRequest, requiredScopes: string[] = []) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    const token = req.headers.authorization?.split(" ")[1] || "";
    const authorizedAccount = await isAuthorized(token, requiredScopes);
    if (!authorizedAccount) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
    return { account: authorizedAccount, appApiKey: undefined };
  }

  const validKey = await retrieveValidApiKey(apiKey, "zapier");
  if (!validKey) throw new HttpError({ statusCode: 401, message: "API key not valid" });
  return { account: null, appApiKey: validKey };
}
