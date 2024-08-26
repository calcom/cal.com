import type { NextApiRequest } from "next";
import type { NextMiddleware } from "next-api-middleware";
import * as crypto from "node:crypto";

const messages = {
  TOKEN_NOT_SUPPLIED: "TOKEN_NOT_SUPPLIED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
};

export type TokenDetails = {
  token: string;
  generatedAt: number;
};

export type ZohoUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
};

export interface CrmAuthenticatedNextApiRequest extends NextApiRequest {
  zohoUser?: ZohoUser;
  tokenDetails?: TokenDetails;
}

const verifyCRMAuthorization = (
  authorization?: string
): {
  zohoUser: ZohoUser;
  tokenDetails: TokenDetails;
} => {
  if (!authorization) {
    throw new Error(messages.TOKEN_NOT_SUPPLIED);
  }
  if (authorization.split(" ")[0] !== "Bearer") {
    throw new Error(messages.TOKEN_INVALID);
  }
  const [, token] = authorization.split(" ");

  if (!token) {
    throw new Error(messages.TOKEN_NOT_SUPPLIED);
  }

  const signatureWithData = Buffer.from(token, "base64").toString("utf8");
  const [signature, timestamp, userObjectString] = signatureWithData.split("|");
  const signatureData = `${timestamp}|${userObjectString}`;
  const createdSignature = crypto
    .createHmac("sha1", process.env.ZOHO_CRM_SECRET_KEY || "")
    .update(signatureData)
    .digest("base64");

  if (createdSignature !== signature) {
    throw new Error(messages.TOKEN_INVALID);
  }

  const now = new Date();
  const tokenExpiresAt = new Date(new Date(Number(timestamp)).getTime() + 10 * 60 * 60 * 1000);

  const hasExpired = tokenExpiresAt < now;
  if (hasExpired) {
    throw new Error(messages.TOKEN_EXPIRED);
  }

  return {
    zohoUser: JSON.parse(userObjectString) as ZohoUser,
    tokenDetails: { token, generatedAt: Number(timestamp) },
  };
};

export const verifyCrmToken: NextMiddleware = async function (req, res, next) {
  req = req as CrmAuthenticatedNextApiRequest;

  try {
    const { authorization } = req.headers;
    const _result = { tokenDetails: undefined, zohoUser: undefined } || verifyCRMAuthorization(authorization);

    await next();
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return res.status(401).json({
        message: Object.values(messages).includes(error.message) ? error.message : `${error.message}`,
      });
    }

    return res.status(401).json({
      message: `Unable to verify crm token`,
    });
  }
};
