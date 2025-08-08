import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { uuid } from "short-uuid";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { SAMLResponsePayload } from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";

async function handler(req: NextRequest) {
  const log = logger.getSubLogger({ prefix: ["[SAML callback]"] });
  const { oauthController } = await jackson();

  const requestData = (await parseRequestData(req)) as SAMLResponsePayload;

  const { redirect_url, error } = await oauthController.samlResponse(requestData);

  if (redirect_url) {
    return NextResponse.redirect(redirect_url, 302);
  }

  if (error) {
    const uid = uuid();
    log.error(
      `Error authenticating user with error ${error} for relayState ${requestData?.RelayState} trace:${uid}`
    );
    return NextResponse.json({ message: `Error authorizing user. trace: ${uid}` }, { status: 400 });
  }

  return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
}

export const POST = defaultResponderForAppDir(handler);
