import type { OAuthReq } from "@boxyhq/saml-jackson";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { HttpError } from "@calcom/lib/http-error";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  try {
    const { redirect_url } = await oauthController.authorize(
      Object.fromEntries(req.nextUrl.searchParams) as unknown as OAuthReq
    );

    return NextResponse.redirect(redirect_url as string, 302);
  } catch (err) {
    const { message, statusCode = 500 } = err as HttpError;

    return NextResponse.json({ message }, { status: statusCode });
  }
}

const getHandler = defaultResponderForAppDir(handler);

export { getHandler as GET };

export const dynamic = "force-dynamic";
