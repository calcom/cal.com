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

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const REQUIRED_WHATSAPP_SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging"];
const WEBHOOK_FIELDS = ["messages", "account_update"];

type AuthMethod = "embedded" | "manual";

interface ManualAuthPayload {
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  api_key: string;
}

interface PhoneNumberData {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
}

interface EmbeddedSignupPayload {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

interface PhoneNumberHealthData {
  platform_type?: string;
  throughput?: {
    level?: string;
  };
}

// ============================================================================
// PHONE NUMBER VERIFICATION & REGISTRATION
// ============================================================================

/**
 * Generate a secure 6-digit PIN for phone number registration
 */
function generateRegistrationPin(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}

/**
 * Check if phone number's code verification is complete
 */
async function isPhoneNumberVerified(phoneNumberId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}?` +
        `fields=code_verification_status,is_on_biz_app,platform_type&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error(`[Phone Verification] Failed to check status for ${phoneNumberId}`);
      return false;
    }

    const data = await response.json();
    const isVerified = data.code_verification_status === "VERIFIED";

    // Support for coexistance flow.
    console.log(
      `[Phone Verification] Phone ${phoneNumberId} on Biz App? ${data.is_on_biz_app} with platform_type? ${data.platform_type}`
    );

    if (data.is_on_biz_app && data.platform_type === "CLOUD_API") {
      return true;
    }

    console.log(`[Phone Verification] Phone ${phoneNumberId} verification status: ${isVerified}`);

    return isVerified;
  } catch (error) {
    console.error(`[Phone Verification] Error checking status:`, error);
    return false;
  }
}

/**
 * Check phone number health status to determine if registration is needed
 */
async function getPhoneNumberHealthStatus(
  phoneNumberId: string,
  accessToken: string
): Promise<PhoneNumberHealthData> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}?` +
        `fields=platform_type,throughput&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.warn(`[Health Check] Failed for phone ${phoneNumberId}`);
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error(`[Health Check] Error:`, error);
    return {};
  }
}

/**
 * Determine if phone number needs registration based on health data
 */
function phoneNumberNeedsRegistration(healthData: PhoneNumberHealthData): boolean {
  // Phone number is in pending/unprovisioned state if:
  // 1. platform_type is "NOT_APPLICABLE" (not fully set up)
  // 2. throughput.level is "NOT_APPLICABLE" (no messaging capacity)
  const needsRegistration =
    healthData.platform_type === "NOT_APPLICABLE" || healthData.throughput?.level === "NOT_APPLICABLE";

  console.log(`[Registration Check] Needs registration: ${needsRegistration}`, healthData);

  return needsRegistration;
}

/**
 * Register a phone number with WhatsApp Business API
 */
async function registerPhoneNumber(
  phoneNumberId: string,
  pin: number,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: pin.toString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Phone Registration] Failed:`, errorData);
      return {
        success: false,
        error: errorData.error?.message || "Registration failed",
      };
    }

    const data = await response.json();
    console.log(`[Phone Registration] Success for ${phoneNumberId}`);

    return { success: data.success || true };
  } catch (error) {
    console.error(`[Phone Registration] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Complete phone number setup: verification check, registration if needed
 */
async function setupPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  existingPin?: number
): Promise<{ pin: number; registered: boolean }> {
  console.log(`[Phone Setup] Starting setup for ${phoneNumberId}`);

  // Check if phone is already verified
  const isVerified = await isPhoneNumberVerified(phoneNumberId, accessToken);

  // Check health status to determine if registration is needed
  const healthData = await getPhoneNumberHealthStatus(phoneNumberId, accessToken);
  const needsRegistration = phoneNumberNeedsRegistration(healthData);

  // Determine if we should register the phone number
  const shouldRegister = !isVerified || needsRegistration;

  if (!shouldRegister) {
    console.log(`[Phone Setup] Phone ${phoneNumberId} already set up, skipping registration`);
    return { pin: existingPin || 0, registered: false };
  }

  // Get or generate PIN
  const pin = existingPin || generateRegistrationPin();
  console.log(`[Phone Setup] Attempting registration for ${phoneNumberId}`);

  // Attempt registration
  const result = await registerPhoneNumber(phoneNumberId, pin, accessToken);

  if (!result.success) {
    console.warn(`[Phone Setup] Registration failed but continuing: ${result.error}`);
    // Don't throw - continue with webhook setup even if registration fails
  }

  return { pin, registered: result.success || false };
}

// ============================================================================
// WEBHOOK SUBSCRIPTION
// ============================================================================

async function subscribeToWebhooks(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscribeUrl = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/subscribed_apps`;

    const body: any = {
      access_token: accessToken,
      subscribed_fields: WEBHOOK_FIELDS,
    };

    const response = await fetch(subscribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Webhook] Subscription failed:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to subscribe to webhooks",
      };
    }

    const data = await response.json();

    if (data.success) {
      console.log(`[Webhook] Successfully subscribed for WABA: ${wabaId}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: "Webhook subscription returned unsuccessful response",
      };
    }
  } catch (error) {
    console.error("[Webhook] Error subscribing:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build webhook callback URL for a specific phone number
 */
function buildWebhookCallbackUrl(phoneNumber: string): string {
  const frontendUrl = WEBAPP_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;
  return `${frontendUrl}/api/integrations/whatsapp-business/webhook/${phoneNumber}`;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

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

// ============================================================================
// PERMISSION & TOKEN VERIFICATION
// ============================================================================

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

async function verifyAccessToken(options?: {
  api_key: string;
  wabaId?: string;
  phoneNumberId?: string;
  phoneNumber?: string;
}): Promise<{ isValid: boolean; wabaIds: string[] }> {
  const accessToken = options?.api_key;
  const appAccessToken = `${META_WHATSAPP_BUSINESS_APP_ID}|${META_WHATSAPP_BUSINESS_APP_SECRET}`;

  const debugRes = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/debug_token` +
      `?input_token=${accessToken}` +
      `&access_token=${appAccessToken}`
  );

  if (!debugRes.ok) {
    throw new HttpError({
      statusCode: debugRes.status,
      message: "Failed to debug access token",
    });
  }

  const debugJson = await debugRes.json();
  const tokenData = debugJson?.data;

  if (!tokenData?.is_valid) {
    throw new HttpError({
      statusCode: 400,
      message: "Invalid or expired access token",
    });
  }

  if (tokenData.app_id !== META_WHATSAPP_BUSINESS_APP_ID) {
    throw new HttpError({
      statusCode: 403,
      message: "Access token does not belong to this app",
    });
  }

  const scopes: string[] = tokenData.scopes || [];
  const hasRequiredScopes = REQUIRED_WHATSAPP_SCOPES.every((s) => scopes.includes(s));

  if (!hasRequiredScopes) {
    throw new HttpError({
      statusCode: 403,
      message: "Required WhatsApp permissions not granted",
    });
  }

  const granular = tokenData.granular_scopes || [];
  const wabaScope = granular.find((g: any) => g.scope === "whatsapp_business_management");

  if (wabaScope?.target_ids?.length) {
    return {
      isValid: true,
      wabaIds: wabaScope.target_ids,
    };
  }

  if (!options?.wabaId) {
    throw new HttpError({
      statusCode: 400,
      message: "WABA ID is required for manual token verification",
    });
  }

  const wabaCheck = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${options.wabaId}/message_templates` +
      `?access_token=${accessToken}`
  );

  if (!wabaCheck.ok) {
    throw new HttpError({
      statusCode: 403,
      message: "Access token does not have access to this WhatsApp Business Account",
    });
  }

  if (options.phoneNumberId) {
    const phoneRes = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${options.phoneNumberId}` +
        `?fields=display_phone_number` +
        `&access_token=${accessToken}`
    );

    if (!phoneRes.ok) {
      throw new HttpError({
        statusCode: 403,
        message: "Access token does not have access to this phone number ID",
      });
    }

    let phoneData = await phoneRes.json();

    if (
      options.phoneNumber &&
      phoneData.display_phone_number.replaceAll(" ", "") !== options.phoneNumber.replaceAll(" ", "")
    ) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number ID does not match provided phone number",
      });
    }
  }

  return {
    isValid: true,
    wabaIds: [options.wabaId],
  };
}

// ============================================================================
// PHONE NUMBER OPERATIONS
// ============================================================================

async function getSpecificPhoneNumber(
  phoneNumberId: string,
  accessToken: string
): Promise<PhoneNumberData | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}?` +
        `fields=id,display_phone_number,verified_name,code_verification_status,quality_rating` +
        `&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch phone number ${phoneNumberId}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Error fetching phone number ${phoneNumberId}:`, error);
    return null;
  }
}

async function getMessageTemplates(wabaId: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch templates for WABA ${wabaId}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn(`Error fetching templates for WABA ${wabaId}:`, error);
    return [];
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

interface ExistingPhoneNumber {
  phoneNumberId: string;
  phoneNumber: string;
  credentialId: number;
}

async function getExistingPhoneNumbers(phoneNumbers: PhoneNumberData[]): Promise<ExistingPhoneNumber[]> {
  return await prisma.whatsAppBusinessPhone.findMany({
    where: {
      OR: [
        { phoneNumberId: { in: phoneNumbers.map((pn) => pn.id) } },
        { phoneNumber: { in: phoneNumbers.map((pn) => pn.display_phone_number) } },
      ],
    },
    select: {
      phoneNumberId: true,
      phoneNumber: true,
      credentialId: true,
    },
  });
}

async function createCredential({
  userId,
  teamId,
  accessToken,
  tokenType,
  wabaId,
  phoneNumberId,
  phoneNumber,
  expiresIn,
}: {
  userId: number | null;
  teamId: number | undefined;
  accessToken: string;
  tokenType?: string;
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  expiresIn?: number;
}) {
  const key = {
    access_token: accessToken,
    token_type: tokenType,
    expires_in: expiresIn,
    obtained_at: Date.now(),
    wabaId,
    phoneNumberId,
    phoneNumber,
  };

  return await CredentialRepository.create({
    userId: !teamId ? userId : null,
    calIdTeamId: teamId,
    key,
    appId: "whatsapp-business",
    type: "whatsapp-business_messaging",
  });
}

async function createPhoneRecord(
  userId: number | null,
  teamId: number | undefined,
  credentialId: number,
  wabaId: string,
  phoneData: PhoneNumberData,
  templates: any[],
  verificationPin?: number
) {
  return await prisma.whatsAppBusinessPhone.create({
    data: {
      userId: !teamId ? userId : null,
      calIdTeamId: teamId,
      credentialId,
      wabaId,
      phoneNumberId: phoneData.id,
      phoneNumber: phoneData.display_phone_number,
      templates,
      verificationPin: verificationPin ? String(verificationPin) : null,
    },
  });
}

async function updatePhoneRecord(
  phoneNumberId: string,
  updates: {
    verificationPin?: number;
    templates?: any[];
  }
) {
  return await prisma.whatsAppBusinessPhone.update({
    where: { phoneNumberId },
    data: updates,
  });
}

// ============================================================================
// MAIN FLOW HANDLERS
// ============================================================================

async function handleEmbeddedSignup(
  req: NextApiRequest,
  payload: EmbeddedSignupPayload,
  teamId: number | undefined
): Promise<{ success: boolean; message: string; url: string }> {
  const { code, wabaId, phoneNumberId } = payload;

  console.log(`[Embedded Signup] Processing for WABA: ${wabaId}, Phone: ${phoneNumberId}`);

  // Step 1: Exchange code for tokens
  const { client_id, client_secret } = await getWhatsAppBusinessAppKeys();

  console.log("[Embedded Signup] Step 1: Exchanging code for short-lived token");
  const tokenData = await exchangeCodeForToken(code, client_id, client_secret);
  const shortLivedToken = tokenData.access_token;

  console.log("[Embedded Signup] Step 2: Exchanging for long-lived token");
  const longLivedTokenData = await exchangeForLongLivedToken(shortLivedToken, client_id, client_secret);
  const longLivedToken = longLivedTokenData.access_token;

  console.log("[Embedded Signup] Step 3: Verifying permissions");
  await verifyPermissions(longLivedToken);

  // Step 2: Fetch phone number details
  console.log("[Embedded Signup] Step 4: Fetching phone number details");
  let phoneData = await getSpecificPhoneNumber(phoneNumberId, longLivedToken);

  if (!phoneData) {
    throw new HttpError({
      statusCode: 404,
      message: "Phone number not found or inaccessible",
    });
  }

  // Step 3: Check if phone already exists
  const existingPhones = await getExistingPhoneNumbers([phoneData]);

  if (existingPhones.length > 0) {
    throw new HttpError({
      statusCode: 409,
      message: "This phone number is already registered",
    });
  }

  // Step 4: Setup phone number (registration + PIN handling)
  console.log("[Embedded Signup] Step 4: Setting up phone number");
  const { pin, registered } = await setupPhoneNumber(phoneNumberId, longLivedToken);

  // Step 5: Subscribe to webhooks
  console.log("[Embedded Signup] Step 5: Subscribing to webhooks");
  const webhookResult = await subscribeToWebhooks(wabaId, longLivedToken);

  if (!webhookResult.success) {
    console.warn(`[Embedded Signup] Webhook subscription warning:`, webhookResult.error);
    // Continue even if webhook fails
  }

  // Step 6: Fetch templates
  console.log("[Embedded Signup] Step 6: Fetching message templates");
  const templates = await getMessageTemplates(wabaId, longLivedToken);

  // Step 7: Create credential
  console.log("[Embedded Signup] Step 7: Creating credential");
  const credential = await createCredential({
    userId: req.session!.user.id,
    teamId,
    accessToken: longLivedToken,
    tokenType: longLivedTokenData.token_type || "bearer",
    expiresIn: longLivedTokenData.expires_in,
    wabaId,
    phoneNumber: phoneData.display_phone_number,
    phoneNumberId: phoneData.id,
  });

  // Step 8: Create phone record with PIN and webhook token
  console.log("[Embedded Signup] Step 8: Creating phone record");
  await createPhoneRecord(req.session!.user.id, teamId, credential.id, wabaId, phoneData, templates, pin);

  console.log("[Embedded Signup] Successfully completed setup");

  return {
    success: true,
    message: "WhatsApp Business phone number added successfully",
    url: "/apps/installed/messaging",
  };
}

async function handleManualAuth(
  req: NextApiRequest,
  payload: ManualAuthPayload,
  teamId: number | undefined
): Promise<{ success: boolean; message: string; url: string }> {
  const { wabaId, phoneNumberId, phoneNumber, api_key } = payload;

  console.log("[Manual Auth] Step 1: Verifying access token");
  const { wabaIds } = await verifyAccessToken(payload);

  if (!wabaIds.includes(wabaId)) {
    throw new HttpError({
      statusCode: 403,
      message: "Access token does not have permission for the specified WABA ID",
    });
  }

  console.log("[Manual Auth] Step 2: Fetching phone number details");
  let phoneData: PhoneNumberData | null = await getSpecificPhoneNumber(phoneNumberId, api_key);

  if (!phoneData) {
    phoneData = {
      id: phoneNumberId,
      display_phone_number: phoneData.display_phone_number,
    };
  }

  const existingPhones = await getExistingPhoneNumbers([phoneData]);

  if (existingPhones.length > 0) {
    throw new HttpError({
      statusCode: 409,
      message: "This phone number is already registered",
    });
  }

  console.log("[Manual Auth] Step 3: Setting up phone number [not needed for manual flow]");
  // const { pin } = await setupPhoneNumber(phoneNumberId, api_key);

  console.log("[Manual Auth] Step 4: Subscribing to webhooks");
  const webhookResult = await subscribeToWebhooks(wabaId, api_key);

  if (!webhookResult.success) {
    console.warn(`[Manual Auth] Webhook subscription warning:`, webhookResult.error);
  }

  console.log("[Manual Auth] Step 5: Fetching templates");
  const templates = await getMessageTemplates(wabaId, api_key);

  console.log("[Manual Auth] Step 6: Creating credential");
  const credential = await createCredential({
    userId: req.session!.user.id,
    teamId,
    accessToken: api_key,
    wabaId,
    phoneNumber: phoneData.display_phone_number,
    phoneNumberId: phoneData.id,
  });

  console.log("[Manual Auth] Step 7: Creating phone record");
  await createPhoneRecord(req.session!.user.id, teamId, credential.id, wabaId, phoneData, templates);

  return {
    success: true,
    message: "WhatsApp Business phone number added successfully",
    url: "/apps/installed/messaging",
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure webhook verify token
 */
function generateWebhookVerifyToken(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const teamId = req.query.teamId ? parseInt(req.query.teamId as string, 10) : undefined;

  try {
    const { code, wabaId, phoneNumberId } = req.query;

    if (!code || typeof code !== "string") {
      throw new HttpError({
        statusCode: 400,
        message: "Missing required parameter: code",
      });
    }

    if (!wabaId || typeof wabaId !== "string") {
      throw new HttpError({
        statusCode: 400,
        message: "Missing required parameter: wabaId",
      });
    }

    if (!phoneNumberId || typeof phoneNumberId !== "string") {
      throw new HttpError({
        statusCode: 400,
        message:
          "Missing required parameter: phoneNumberId, You need to add a phone number or a display name.",
      });
    }

    const payload: EmbeddedSignupPayload = {
      code,
      wabaId,
      phoneNumberId,
    };

    const result = await handleEmbeddedSignup(req, payload, teamId);

    res.status(200).json(result);
  } catch (error) {
    console.error("[Handler] Error:", error);

    let errorMessage = "something_went_wrong";
    let statusCode = 500;

    if (error instanceof HttpError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const teamId = req.query.teamId ? parseInt(req.query.teamId as string, 10) : undefined;

  try {
    const hasManualFields = req.body?.wabaId && req.body?.phoneNumberId && req.body?.api_key;

    if (!hasManualFields) {
      throw new HttpError({
        statusCode: 400,
        message: "Missing required fields: wabaId, phoneNumberId, phoneNumber, api_key",
      });
    }

    const manualPayload: ManualAuthPayload = {
      wabaId: req.body.wabaId,
      phoneNumberId: req.body.phoneNumberId,
      phoneNumber: req.body.phoneNumber,
      api_key: req.body.api_key,
    };

    if (
      !manualPayload.wabaId ||
      !manualPayload.phoneNumberId ||
      !manualPayload.phoneNumber ||
      !manualPayload.api_key
    ) {
      throw new HttpError({
        statusCode: 400,
        message: "Missing required fields: wabaId, phoneNumberId, phoneNumber, api_key",
      });
    }

    const result = await handleManualAuth(req, manualPayload, teamId);

    res.status(200).json(result);
  } catch (error) {
    console.error("[Handler] Error:", error);

    let errorMessage = "something_went_wrong";
    let statusCode = 500;

    if (error instanceof HttpError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
