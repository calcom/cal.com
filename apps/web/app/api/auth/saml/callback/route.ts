import type { SAMLResponsePayload } from "@calcom/features/ee/sso/lib/jackson";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { uuid } from "short-uuid";

async function handler(req: NextRequest) {
  const uid = uuid();
  const log = logger.getSubLogger({ prefix: ["[SAML callback]", `trace: ${uid}`] });
  const { oauthController } = await jackson();

  const requestData = (await parseRequestData(req)) as SAMLResponsePayload;

  try {
    const { redirect_url, error } = await oauthController.samlResponse(requestData);

    if (redirect_url) {
      return NextResponse.redirect(redirect_url, 302);
    }

    if (error) {
      const uid = uuid();
      log.error(`Error authenticating user with error ${error} for relayState ${requestData?.RelayState}`);
      return NextResponse.json({ message: `Error authorizing user. trace: ${uid}` }, { status: 400 });
    }
  } catch (error) {
    log.error(`Error processing SAML response`, error);
    return NextResponse.json({ message: `Error processing SAML response. trace: ${uid}` }, { status: 500 });
  }

  return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
}

export const POST = defaultResponderForAppDir(handler);
