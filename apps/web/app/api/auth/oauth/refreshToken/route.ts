import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { HttpError } from "@calcom/lib/http-error";

async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type, refresh_token, code_verifier } = await parseUrlFormData(req);

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ message: "CALENDSO_ENCRYPTION_KEY is not set" }, { status: 500 });
  }

  if (!client_id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (grant_type !== "refresh_token") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const oAuthService = getOAuthService();
    const refreshTokenValue = refresh_token || req.headers.get("authorization")?.split(" ")[1] || "";
    const tokens = await oAuthService.refreshAccessToken(
      client_id,
      refreshTokenValue,
      client_secret,
      code_verifier
    );

    return NextResponse.json(
      {
        access_token: tokens.accessToken,
        token_type: "bearer",
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
  }

  return NextResponse.json({ error: "error_refresh_tokens" }, { status: 500 });
}

export const POST = defaultResponderForAppDir(handler);
