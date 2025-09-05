import type { OAuthReq } from "@calcom/features/ee/sso/lib/jackson";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function handler(req: NextRequest) {
  const log = logger.getSubLogger({ prefix: ["[SAML authorize]"] });
  const { oauthController } = await jackson();

  const oAuthReq = Object.fromEntries(req.nextUrl.searchParams) as unknown as OAuthReq;

  try {
    const { redirect_url } = await oauthController.authorize(oAuthReq);

    return NextResponse.redirect(redirect_url as string, 302);
  } catch (err) {
    log.error(`Error initaiting SAML login for tenant ${oAuthReq?.tenant}: ${err}`);
    const { message, statusCode = 500 } = err as HttpError;

    return NextResponse.json({ message }, { status: statusCode });
  }
}

export const GET = defaultResponderForAppDir(handler);

export const dynamic = "force-dynamic";
