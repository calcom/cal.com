import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import type { SAMLResponsePayload } from "@calcom/features/ee/sso/lib/jackson";
import { samlProductID, tenantPrefix } from "@calcom/features/ee/sso/lib/saml";
import logger from "@calcom/lib/logger";

async function handler(req: NextRequest) {
  const { oauthController, connectionController } = await jackson();

  let requestData: SAMLResponsePayload | undefined;

  try {
    requestData = (await parseRequestData(req)) as SAMLResponsePayload;

    let orgId: string | null = null;
    let tenant: string | null = null;

    try {
      if (requestData.RelayState) {
        if (requestData.RelayState.startsWith(tenantPrefix)) {
          tenant = requestData.RelayState;
          orgId = tenant.substring(tenantPrefix.length);
        } else {
          try {
            const connections = await connectionController.getConnections({
              tenant: requestData.RelayState,
              product: samlProductID,
            });
            if (connections.length > 0) {
              tenant = connections[0].tenant;
              if (tenant.startsWith(tenantPrefix)) {
                orgId = tenant.substring(tenantPrefix.length);
              }
            }
          } catch {}
        }
      }

      if (!orgId && requestData.SAMLResponse) {
      }
    } catch (connectionError) {
      logger.warn("SAML callback: Could not extract organization context", {
        error: connectionError instanceof Error ? connectionError.message : String(connectionError),
        relayState: requestData.RelayState,
      });
    }

    logger.info("SAML callback initiated", {
      orgId: orgId,
      tenant: tenant,
      relayState: requestData.RelayState,
      hasIdpHint: !!requestData.idp_hint,
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    const { redirect_url } = await oauthController.samlResponse(requestData);

    if (redirect_url) {
      logger.info("SAML callback successful", {
        orgId: orgId,
        tenant: tenant,
        redirectUrl: redirect_url,
      });
      return NextResponse.redirect(redirect_url, 302);
    }

    logger.error("SAML callback failed: No redirect URL provided", {
      orgId: orgId,
      tenant: tenant,
      relayState: requestData.RelayState,
    });
    return NextResponse.json({ message: "No redirect URL provided" }, { status: 400 });
  } catch (error) {
    logger.error("SAML callback error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      relayState: requestData?.RelayState,
    });
    throw error;
  }
}

export const POST = defaultResponderForAppDir(handler);
