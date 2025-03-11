import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();
  const tokenResponse = await oauthController.token(await req.json());
  return NextResponse.json(tokenResponse);
}

const postHandler = defaultResponderForAppDir(handler);

export { postHandler as POST };
