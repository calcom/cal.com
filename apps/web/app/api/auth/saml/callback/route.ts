import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { SAMLResponsePayload } from "@calcom/features/ee/sso/lib/jackson";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  const { redirect_url } = await oauthController.samlResponse(
    (await parseRequestData(req)) as SAMLResponsePayload
  );

  if (redirect_url) {
    return NextResponse.redirect(redirect_url, 302);
  }

  return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
}

export const POST = defaultResponderForAppDir(handler);
