import type { SAMLResponsePayload } from "@boxyhq/saml-jackson";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();
  const formData = await req.formData();
  const formDataObj = Object.fromEntries(formData.entries());
  const { redirect_url } = await oauthController.samlResponse(formDataObj as unknown as SAMLResponsePayload);

  if (redirect_url) {
    return NextResponse.redirect(redirect_url, 302);
  }

  return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
}

const postHandler = defaultResponderForAppDir(handler);

export { postHandler as POST };
