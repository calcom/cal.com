import type { NextApiRequest, NextApiResponse } from "next";
import {
  WEBAPP_URL,
  META_WHATSAPP_BUSINESS_APP_ID,
  META_WHATSAPP_BUSINESS_APP_SECRET,
  META_API_VERSION,
} from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";

import { getWhatsAppBusinessAppKeys } from "../lib/getWhatsAppBusinessAppKeys";

const REQUIRED_WHATSAPP_SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging"];

const WEBHOOK_FIELDS = [
  "messages",
];

async function subscribeToWebhooks(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscribeUrl = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/subscribed_apps`;

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

/**
 * Exchange authorization code for access token
 * For embedded signup, this is a direct exchange without redirect_uri
 */
async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string) {
  const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.append("client_id", clientId);
  tokenUrl.searchParams.append("client_secret", clientSecret);
  tokenUrl.searchParams.append("code", code);

  const tokenResponse = await fetch(tokenUrl.toString());

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({}));
    throw new HttpError({
      statusCode: tokenResponse.status,
      message: errorData.error?.message || "Failed to exchange code for access token",
    });
  }

  return tokenResponse.json();
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
async function exchangeForLongLivedToken(shortLivedToken: string, clientId: string, clientSecret: string) {
  const longLivedTokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);

  longLivedTokenUrl.searchParams.append("grant_type", "fb_exchange_token");
  longLivedTokenUrl.searchParams.append("client_id", clientId);
  longLivedTokenUrl.searchParams.append("client_secret", clientSecret);
  longLivedTokenUrl.searchParams.append("fb_exchange_token", shortLivedToken);

  const longLivedTokenResponse = await fetch(longLivedTokenUrl.toString());

  if (!longLivedTokenResponse.ok) {
    const errorData = await longLivedTokenResponse.json().catch(() => ({}));
    throw new HttpError({
      statusCode: longLivedTokenResponse.status,
      message: errorData.error?.message || "Failed to exchange for long-lived token",
    });
  }

  return longLivedTokenResponse.json();
}

/**
 * Verify token and get granted permissions
 */
async function verifyPermissions(accessToken: string) {
  const permissionsResponse = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me/permissions?access_token=${accessToken}`
  );

  if (!permissionsResponse.ok) {
    throw new HttpError({
      statusCode: permissionsResponse.status,
      message: "Failed to fetch permissions",
    });
  }

  const permissionsData = await permissionsResponse.json();
  const grantedScopes =
    permissionsData.data?.filter((p: any) => p.status === "granted")?.map((p: any) => p.permission) ?? [];

  const hasMissingRequiredScopes = REQUIRED_WHATSAPP_SCOPES.some((scope) => !grantedScopes.includes(scope));

  if (hasMissingRequiredScopes) {
    throw new HttpError({
      statusCode: 403,
      message: "Required WhatsApp permissions not granted",
    });
  }

  return grantedScopes;
}

/**
 * Get WABA IDs from token debug
 */
async function getWABAIds(accessToken: string) {
  const developerToken = `${META_WHATSAPP_BUSINESS_APP_ID}|${META_WHATSAPP_BUSINESS_APP_SECRET}`;

  const wabaResponse = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${accessToken}&access_token=${developerToken}`
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

  const wabaIds = wabaData.data?.granular_scopes?.find(
    (scope: any) => scope.scope === "whatsapp_business_management"
  )?.target_ids;

  if (!wabaIds || wabaIds.length === 0) {
    throw new HttpError({
      statusCode: 400,
      message: "No WhatsApp Business Account found",
    });
  }

  return wabaIds;
}

/**
 * Fetch all phone numbers for a WABA with pagination
 */
async function getPhoneNumbers(wabaId: string, accessToken: string) {
  const phoneNumbers = [];
  let after = null;

  do {
    const url = after
      ? `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?access_token=${accessToken}&after=${after}`
      : `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?access_token=${accessToken}`;

    const phoneNumbersResponse = await fetch(url);

    if (!phoneNumbersResponse.ok) {
      throw new HttpError({
        statusCode: phoneNumbersResponse.status,
        message: "Failed to fetch phone numbers",
      });
    }

    const phoneNumbersData = await phoneNumbersResponse.json();

    if (phoneNumbersData.data && phoneNumbersData.data.length > 0) {
      phoneNumbers.push(...phoneNumbersData.data);
    }

    after = phoneNumbersData.paging?.cursors?.after || null;

    if (after && phoneNumbersData.paging?.cursors?.before === after) {
      break;
    }
  } while (after);

  return phoneNumbers;
}

/**
 * Fetch message templates for a WABA
 */
async function getMessageTemplates(wabaId: string, accessToken: string) {
  const templatesResponse = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`
  );

  if (!templatesResponse.ok) {
    console.warn(`Failed to fetch templates for WABA ${wabaId}`);
    return [];
  }

  const templatesData = await templatesResponse.json();
  return templatesData.data || [];
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code, teamId } = req.query;

  // Validate inputs
  if (typeof code !== "string") {
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const calIdTeamId = teamId ? parseInt(teamId as string, 10) : undefined;

  const { client_id, client_secret } = await getWhatsAppBusinessAppKeys();

  try {
    console.log("[Embedded Signup] Step 1: Exchanging code for short-lived token");
    const tokenData = await exchangeCodeForToken(code, client_id, client_secret);
    const shortLivedToken = tokenData.access_token;

    console.log("[Embedded Signup] Step 2: Exchanging for long-lived token");
    const longLivedTokenData = await exchangeForLongLivedToken(shortLivedToken, client_id, client_secret);
    const longLivedToken = longLivedTokenData.access_token;

    console.log("[Embedded Signup] Step 3: Verifying permissions");
    await verifyPermissions(longLivedToken);

    console.log("[Embedded Signup] Step 4: Fetching WABA IDs");
    const wabaIds = await getWABAIds(longLivedToken);

    // Process each WABA
    for (const wabaId of wabaIds) {
      console.log(`[Embedded Signup] Processing WABA: ${wabaId}`);

      // Fetch phone numbers
      const phoneNumbers = await getPhoneNumbers(wabaId, longLivedToken);

      if (phoneNumbers.length === 0) {
        console.warn(`No phone numbers found for WABA ${wabaId}`);
        continue;
      }

      // Fetch templates
      const templates = await getMessageTemplates(wabaId, longLivedToken);

      // Check for existing phone numbers
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

      const phonesToCreate = phoneNumbers.filter(
        (pn: any) =>
          !existingPhoneNumberIds.has(pn.id) && !existingPhoneNumbersSet.has(pn.display_phone_number)
      );

      if (phonesToCreate.length === 0) {
        console.log(`All phone numbers for WABA ${wabaId} already exist`);
        continue;
      }

      // Create credential
      console.log(`[Embedded Signup] Creating credential for ${phonesToCreate.length} new phone(s)`);
      const key = {
        access_token: longLivedToken,
        token_type: longLivedTokenData.token_type || "bearer",
        expires_in: longLivedTokenData.expires_in,
        obtained_at: Date.now(),
      };

      const whatsappCredential = await CredentialRepository.create({
        userId: !calIdTeamId ? req.session.user.id : null,
        calIdTeamId: calIdTeamId,
        key,
        appId: "whatsapp-business",
        type: "whatsapp-business_messaging",
      });

      // Subscribe to webhooks
      console.log(`[Embedded Signup] Subscribing to webhooks for WABA ${wabaId}`);
      const webhookResult = await subscribeToWebhooks(wabaId, longLivedToken);

      if (!webhookResult.success) {
        console.warn(`Webhook subscription failed for WABA ${wabaId}:`, webhookResult.error);
      }

      // Create phone records
      console.log(`[Embedded Signup] Creating ${phonesToCreate.length} phone record(s)`);
      await Promise.all(
        phonesToCreate.map(async (pn: any) => {
          return prisma.whatsAppBusinessPhone.create({
            data: {
              userId: !calIdTeamId ? req.session.user.id : null,
              calIdTeamId: calIdTeamId,
              credentialId: whatsappCredential.id,
              wabaId: wabaId,
              phoneNumberId: pn.id,
              phoneNumber: pn.display_phone_number,
              templates: templates,
            },
          });
        })
      );

      console.log(`[Embedded Signup] Successfully processed WABA ${wabaId}`);
    }

    // Success response for embedded signup (AJAX call)
    res.status(200).json({
      success: true,
      message: "WhatsApp Business account connected successfully",
    });
  } catch (error) {
    console.error("[Embedded Signup] Error:", error);

    let errorMessage = "something_went_wrong";
    let statusCode = 500;

    if (error instanceof HttpError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }

    // Return JSON error for embedded signup
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
