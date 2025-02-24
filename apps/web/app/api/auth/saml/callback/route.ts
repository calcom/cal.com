import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  const { redirect_url } = await oauthController.samlResponse(await req.json());

  if (redirect_url) {
    return NextResponse.redirect(redirect_url, 302);
  }

  return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
}

const postHandler = apiRouteMiddleware((req: NextRequest) => handler(req));

export { postHandler as POST };
