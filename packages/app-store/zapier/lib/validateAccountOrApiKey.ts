import type { NextApiRequest } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";

export async function validateAccountOrApiKey(req: NextApiRequest, requiredScopes: string[] = []) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    const token = req.headers.authorization?.split(" ")[1] || "";
    const authorizedAccount = await isAuthorized(token, requiredScopes);
    if (!authorizedAccount) throw new ErrorWithCode(ErrorCode.Unauthorized, "Unauthorized");
    return { account: authorizedAccount, appApiKey: undefined };
  }

  const validKey = await findValidApiKey(apiKey, "zapier");
  if (!validKey) throw new ErrorWithCode(ErrorCode.Unauthorized, "API key not valid");
  return { account: null, appApiKey: validKey };
}
