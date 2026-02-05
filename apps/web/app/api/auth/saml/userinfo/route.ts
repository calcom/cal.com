import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { uuid } from "short-uuid";
import { z } from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

const extractAuthToken = (req: NextRequest) => {
  const log = logger.getSubLogger({ prefix: ["SAML extractAuthToken"] });
  const uid = uuid();
  const authHeader = req.headers.get("authorization");
  const parts = (authHeader || "").split(" ");
  if (parts.length > 1) return parts[1];

  // check for query param
  let arr: string[] = [];
  const tokenParse = requestQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  let access_token;
  if (!tokenParse.success) {
    log.error(`Error parsing request query: ${tokenParse.error} trace ${uid}`);
    throw new HttpError({ statusCode: 401, message: `Unauthorized trace: ${uid}` });
  }
  access_token = tokenParse.data.access_token;
  arr = arr.concat(access_token);
  if (arr[0].length > 0) return arr[0];

  throw new HttpError({ statusCode: 401, message: `Unauthorized trace: ${uid}` });
};

const requestQuery = z.object({
  access_token: z.string(),
});

async function handler(req: NextRequest) {
  const log = logger.getSubLogger({ prefix: ["SAML userinfo"] });
  const { oauthController } = await jackson();
  const token = extractAuthToken(req);

  try {
    const userInfo = await oauthController.userInfo(token);
    return NextResponse.json(userInfo);
  } catch (error) {
    const uid = uuid();
    log.error(`trace: ${uid} Error getting user info from token: ${error}`);
    throw new Error(`Error getting user info from token. trace: ${uid}`);
  }
}

export const GET = defaultResponderForAppDir(handler);

export const dynamic = "force-dynamic";
