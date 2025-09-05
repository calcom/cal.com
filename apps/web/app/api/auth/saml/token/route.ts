import type { OAuthTokenReq } from "@calcom/features/ee/sso/lib/jackson";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import * as jose from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as dummy from "openid-client";
import { uuid } from "short-uuid";

async function handler(req: NextRequest) {
  // Need these imports to fix import errors with jackson
  // https://github.com/ory/polis/blob/main/pages/api/import-hack.ts
  const unused = dummy; // eslint-disable-line @typescript-eslint/no-unused-vars
  const unused2 = jose; // eslint-disable-line @typescript-eslint/no-unused-vars
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
