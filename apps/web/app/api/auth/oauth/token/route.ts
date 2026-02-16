import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { OAUTH_ERROR_REASONS } from "@calcom/features/oauth/services/OAuthService";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getHttpStatusCode } from "@calcom/lib/server/getServerErrorFromUnknown";

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri, code_verifier } =
    await parseUrlFormData(req);

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ message: OAUTH_ERROR_REASONS["encryption_key_missing"] }, { status: 500 });
  }

  if (!client_id || !code || !redirect_uri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const oAuthService = getOAuthService();
    const tokens = await oAuthService.exchangeCodeForTokens(
      client_id,
      code,
      client_secret,
      redirect_uri,
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
    if (err instanceof ErrorWithCode) {
      return NextResponse.json({ error: err.message }, { status: getHttpStatusCode(err) });
    }
  }
  return NextResponse.json({ error: "error_code_exchange" }, { status: 500 });
}

export const POST = defaultResponderForAppDir(handler);
