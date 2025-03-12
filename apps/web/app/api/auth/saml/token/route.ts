import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { OAuthTokenReq } from "@calcom/features/ee/sso/lib/jackson";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();
  const tokenResponse = await oauthController.token((await parseRequestData(req)) as OAuthTokenReq);
  return NextResponse.json(tokenResponse);
}

export const POST = defaultResponderForAppDir(handler);
