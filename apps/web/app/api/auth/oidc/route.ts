import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { HttpError } from "@calcom/lib/http-error";

// This is the callback endpoint for the OIDC provider
// A team must set this endpoint in the OIDC provider's configuration
async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

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
    const { message, statusCode = 500 } = err as HttpError;

    return NextResponse.json({ message }, { status: statusCode });
  }
}

export const GET = defaultResponderForAppDir(handler);
