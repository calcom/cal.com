import jackson from "@calcom/features/ee/sso/lib/jackson";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// This is the callback endpoint for the OIDC provider
// A team must set this endpoint in the OIDC provider's configuration
async function handler(req: NextRequest) {
  const log = logger.getSubLogger({ prefix: ["[ODIC auth]"] });
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const tenant = searchParams.get("tenant");

  if (!code || !state) {
    return NextResponse.json({ message: "Code and state are required" }, { status: 400 });
  }

  const { oauthController } = await jackson();

  try {
    const { redirect_url } = await oauthController.oidcAuthzResponse({ code, state });

    if (!redirect_url) {
      throw new HttpError({
        message: "No redirect URL found",
        statusCode: 500,
      });
    }

    return NextResponse.redirect(redirect_url, 302);
  } catch (err) {
    log.error(`Error authorizing tenant ${tenant}: ${err}`);
    const { message, statusCode = 500 } = err as HttpError;

    return NextResponse.json({ message }, { status: statusCode });
  }
}

export const GET = defaultResponderForAppDir(handler);
