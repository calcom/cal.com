import type { OAuthTokenReq } from "@boxyhq/saml-jackson";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();
  const formData = await req.formData();
  const formDataObj = Object.fromEntries(formData.entries());
  const tokenResponse = await oauthController.token(formDataObj as unknown as OAuthTokenReq);
  return NextResponse.json(tokenResponse);
}

const postHandler = defaultResponderForAppDir(handler);

export { postHandler as POST };
