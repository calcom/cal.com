import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData, parseUrlFormData } from "app/api/parseRequestData";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getOAuthService } from "@calcom/features/oauth/di/OAuthService.container";
import { OAUTH_ERROR_REASONS } from "@calcom/features/oauth/services/OAuthService";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getHttpStatusCode } from "@calcom/lib/server/getServerErrorFromUnknown";

async function handler(req: NextRequest) {
  // RFC 6749 §4.1.3 requires application/x-www-form-urlencoded; fall back to it when
  // no Content-Type header is provided so strict OAuth clients still work.
  const ct = req.headers.get("content-type");
  const body = ct ? await parseRequestData(req) : await parseUrlFormData(req);
  const {
    code,
    client_id,
    client_secret,
    grant_type,
    redirect_uri,
    code_verifier,
  } = body as {
    code?: string;
    client_id?: string;
    client_secret?: string;
    grant_type?: string;
    redirect_uri?: string;
    code_verifier?: string;
  };

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
      const status = getHttpStatusCode(err);
      const reason = (err.data?.reason as string) ?? err.message;
      return NextResponse.json(
        { error: err.message, error_description: reason },
        { status }
      );
    }
  }
  return NextResponse.json({ error: "error_code_exchange" }, { status: 500 });
}

export const POST = defaultResponderForAppDir(handler);
