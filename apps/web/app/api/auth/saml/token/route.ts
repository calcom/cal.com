import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { uuid } from "short-uuid";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { OAuthTokenReq } from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();
  const log = logger.getSubLogger({ prefix: ["[SAML token]"] });

  const oauthTokenReq = (await parseRequestData(req)) as OAuthTokenReq;

  try {
    const tokenResponse = await oauthController.token(oauthTokenReq);
    return NextResponse.json(tokenResponse);
  } catch (error) {
    const uid = uuid();
    log.error(`Error getting auth token for client id ${oauthTokenReq?.client_id}: ${error} trace: ${uid}`);
    throw new Error(`Error getting auth token with error ${error} trace: ${uid}`);
  }
}

export const POST = defaultResponderForAppDir(handler);
