import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { getWhatsAppBusinessAppKeys } from "../lib/getWhatsAppBusinessAppKeys";

const REQUIRED_WHATSAPP_SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging"];

// Webhook fields to subscribe to
const WEBHOOK_FIELDS = [
  "messages",
  // "message_template_status_update",
  // "message_status_updates",
  // "account_alerts",
  // "account_update",
  // "phone_number_name_update",
  // "phone_number_quality_update",
  // "template_category_update"
];

async function subscribeToWebhooks(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscribeUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;

    const response = await fetch(subscribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        subscribed_fields: WEBHOOK_FIELDS,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Webhook subscription failed:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to subscribe to webhooks",
      };
    }

    const data = await response.json();

    if (data.success) {
      console.log(`Successfully subscribed to webhooks for WABA: ${wabaId}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: "Webhook subscription returned unsuccessful response",
      };
    }
  } catch (error) {
    console.error("Error subscribing to webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }
  console.log("State is: ", state);

  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const { client_id, client_secret } = await getWhatsAppBusinessAppKeys();

  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/whatsapp-business/callback`;

  try {
    // Step 1: Exchange code for short-lived access token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.append("client_id", client_id);
    tokenUrl.searchParams.append("client_secret", client_secret);
    tokenUrl.searchParams.append("redirect_uri", redirect_uri);
    tokenUrl.searchParams.append("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new HttpError({
        statusCode: tokenResponse.status,
        message: errorData.error?.message || "Failed to exchange code for access token",
      });
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longLivedTokenUrl.searchParams.append("grant_type", "fb_exchange_token");
    longLivedTokenUrl.searchParams.append("client_id", client_id);
    longLivedTokenUrl.searchParams.append("client_secret", client_secret);
    longLivedTokenUrl.searchParams.append("fb_exchange_token", shortLivedToken);

    const longLivedTokenResponse = await fetch(longLivedTokenUrl.toString());

    if (!longLivedTokenResponse.ok) {
      const errorData = await longLivedTokenResponse.json().catch(() => ({}));
      throw new HttpError({
        statusCode: longLivedTokenResponse.status,
        message: errorData.error?.message || "Failed to exchange for long-lived token",
      });
    }

    const longLivedTokenData = await longLivedTokenResponse.json();

    // Step 3: Verify granted scopes
    const permissionsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/permissions?access_token=${longLivedTokenData.access_token}`
    );

    if (permissionsResponse.ok) {
      const permissionsData = await permissionsResponse.json();
      const grantedScopes =
        permissionsData.data?.filter((p: any) => p.status === "granted")?.map((p: any) => p.permission) ?? [];

      const hasMissingRequiredScopes = REQUIRED_WHATSAPP_SCOPES.some(
        (scope) => !grantedScopes.includes(scope)
      );

      if (hasMissingRequiredScopes) {
        if (!state?.fromApp) {
          throw new HttpError({
            statusCode: 400,
            message: "You must grant all permissions to use this integration",
          });
        }
        res.redirect(
          getSafeRedirectUrl(state.onErrorReturnTo) ??
            getSafeRedirectUrl(state?.returnTo) ??
            `${WEBAPP_URL}/apps/installed`
        );
        return;
      }
    }

    // Step 4: Fetch WhatsApp Business Accounts
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${longLivedTokenData.access_token}&access_token=${longLivedTokenData.access_token}`
    );

    const wabaData = await wabaResponse.json();

    if (!wabaResponse.ok) {
      throw new HttpError({
        statusCode: wabaResponse.status,
        message: "Failed to fetch WhatsApp Business Accounts",
      });
    }

    if (!wabaData.data || !wabaData.data.is_valid) {
      throw new HttpError({
        statusCode: 400,
        message: "Invalid access token",
      });
    }

    const wabaId = wabaData.data?.granular_scopes?.find(
      (scope: any) => scope.scope === "whatsapp_business_management"
    )?.target_ids?.[0];

    if (!wabaId) {
      throw new HttpError({
        statusCode: 400,
        message: "No WhatsApp Business Account found",
      });
    }

    // Step 5: Subscribe to webhooks for the WABA
    const webhookResult = await subscribeToWebhooks(wabaId, longLivedTokenData.access_token);

    if (!webhookResult.success) {
      console.warn(`Webhook subscription failed for WABA ${wabaId}:`, webhookResult.error);
      // Continue with the flow even if webhook subscription fails
      // You might want to store this failure for retry later
    }

    // Step 6: Get phone numbers for the WABA
    const phoneNumbersResponse = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${longLivedTokenData.access_token}`
    );

    if (!phoneNumbersResponse.ok) {
      throw new HttpError({
        statusCode: phoneNumbersResponse.status,
        message: "Failed to fetch phone numbers",
      });
    }

    const phoneNumbersData = await phoneNumbersResponse.json();
    const phoneNumbers = phoneNumbersData.data || [];

    if (phoneNumbers.length === 0) {
      throw new HttpError({
        statusCode: 400,
        message: "No phone number found for this WhatsApp Business Account",
      });
    }

    // Step 7: Fetch WhatsApp message templates (shared across all phones in the WABA)
    const templatesResponse = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?access_token=${longLivedTokenData.access_token}`
    );

    let templates = null;
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      templates = templatesData.data || [];
    }

    // Step 8: Check for existing phone numbers to avoid duplicates
    const existingPhoneNumbers = await prisma.whatsAppBusinessPhone.findMany({
      where: {
        OR: [
          { phoneNumberId: { in: phoneNumbers.map((pn: any) => pn.id) } },
          { phoneNumber: { in: phoneNumbers.map((pn: any) => pn.display_phone_number) } },
        ],
      },
      select: {
        phoneNumberId: true,
        phoneNumber: true,
        credentialId: true,
      },
    });

    const existingPhoneNumberIds = new Set(existingPhoneNumbers.map((pn) => pn.phoneNumberId));
    const existingPhoneNumbersSet = new Set(existingPhoneNumbers.map((pn) => pn.phoneNumber));

    // Step 9: Filter out phone numbers that already exist
    const phonesToCreate = phoneNumbers.filter(
      (pn: any) => !existingPhoneNumberIds.has(pn.id) && !existingPhoneNumbersSet.has(pn.display_phone_number)
    );

    if (phonesToCreate.length === 0) {
      // All phone numbers already exist, redirect with appropriate message
      res.redirect(
        getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: "messaging", slug: "whatsapp-business" })
      );
      return;
    }

    // Step 10: Prepare credential data (shared across all phones from the same WABA)
    const key = {
      access_token: longLivedTokenData.access_token,
      token_type: longLivedTokenData.token_type || "bearer",
      expires_in: longLivedTokenData.expires_in,
      obtained_at: Date.now(),
    };

    const whatsappCredential = await CredentialRepository.create({
      userId: !state?.calIdTeamId ? req.session.user.id : null,
      calIdTeamId: state?.calIdTeamId,
      key,
      appId: "whatsapp-business",
      type: "messaging",
    });

    // Step 11: Create WhatsAppBusinessPhone records for each phone number
    await Promise.all(
      phonesToCreate.map(async (pn: any) => {
        // Create the phone record
        // Using createMany with skipDuplicates would be more efficient, but we need individual credentials
        return prisma.whatsAppBusinessPhone.create({
          data: {
            userId: !state?.calIdTeamId ? req.session.user.id : null,
            calIdTeamId: state?.calIdTeamId,
            credentialId: whatsappCredential.id,
            wabaId: wabaId,
            phoneNumberId: pn.id,
            phoneNumber: pn.display_phone_number,
            templates: templates,
          },
        });
      })
    );

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ??
        getInstalledAppPath({ variant: "messaging", slug: "whatsapp-connector" })
    );
    return;
  } catch (error) {
    console.error("WhatsApp OAuth callback error:", error);

    let errorMessage = "something_went_wrong";

    if (error instanceof HttpError) {
      errorMessage = error.message;
    }

    res.redirect(
      `${
        getSafeRedirectUrl(state?.onErrorReturnTo) ??
        getInstalledAppPath({ variant: "messaging", slug: "whatsapp-connector" })
      }?error=${errorMessage}`
    );
    return;
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
