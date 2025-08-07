import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { SAMLResponsePayload } from "@calcom/features/ee/sso/lib/jackson";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

async function handler(req: NextRequest) {
  const { oauthController } = await jackson();

  try {
    const requestData = (await parseRequestData(req)) as SAMLResponsePayload;

    logger.info("SAML callback initiated", {
      samlRequest: safeStringify(requestData),
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    const { redirect_url } = await oauthController.samlResponse(requestData);

    if (redirect_url) {
      logger.info("SAML callback successful", {
        redirectUrl: redirect_url,
      });
      return NextResponse.redirect(redirect_url, 302);
    }

    logger.error("SAML callback failed: No redirect URL provided", {
      samlRequest: safeStringify(requestData),
    });
    return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
  } catch (error) {
    logger.error("SAML callback error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export const POST = defaultResponderForAppDir(handler);
