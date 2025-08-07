import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

const extractAuthToken = (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const parts = (authHeader || "").split(" ");
  if (parts.length > 1) return parts[1];

  // check for query param
  let arr: string[] = [];
  const { access_token } = requestQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  arr = arr.concat(access_token);
  if (arr[0].length > 0) return arr[0];

  throw new HttpError({ statusCode: 401, message: "Unauthorized" });
};

const requestQuery = z.object({
  access_token: z.string(),
});

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  try {
    const token = extractAuthToken(req);

    logger.info("SAML userinfo request initiated", {
      hasToken: !!token,
    });

    const userInfo = await oauthController.userInfo(token);

    logger.info("SAML userinfo retrieved", {
      userId: userInfo?.id,
      email: userInfo?.email,
      firstName: userInfo?.firstName,
      lastName: userInfo?.lastName,
    });

    return NextResponse.json(userInfo);
  } catch (error) {
    logger.error("SAML userinfo error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const GET = defaultResponderForAppDir(handler);

export const dynamic = "force-dynamic";
