import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { OAuthTokenReq } from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  try {
    const requestData = (await parseRequestData(req)) as OAuthTokenReq;

    logger.info("SAML token exchange initiated", {
      code: requestData.code ? "present" : "missing",
      grantType: requestData.grant_type,
    });

    const tokenResponse = await oauthController.token(requestData);

    logger.info("SAML token exchange successful", {
      hasAccessToken: !!tokenResponse.access_token,
    });

    return NextResponse.json(tokenResponse);
  } catch (error) {
    logger.error("SAML token exchange error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const POST = defaultResponderForAppDir(handler);
