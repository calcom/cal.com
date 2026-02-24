import type { WorkflowContext } from "@calid/job-dispatcher";

import { META_API_VERSION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { Credential, Prisma, PrismaClient, WhatsAppBusinessPhone } from "@calcom/prisma/client";

import type { SyncWhatsappTemplatesData } from "./type";

const log = logger.getSubLogger({ prefix: ["[sync-whatsapp-templates]"] });

// ─────────────────────────────────────────────────────────────────────────
// Error hierarchy
// ─────────────────────────────────────────────────────────────────────────

export class WhatsAppSyncError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "WhatsAppSyncError";
  }
}

export class WhatsAppTokenExpiredError extends Error {
  constructor(public readonly phoneNumberId: string) {
    super("WhatsApp Business access token has expired. Please reconnect the integration.");
    this.name = "WhatsAppTokenExpiredError";
  }
}

export class WhatsAppTokenMissingError extends Error {
  constructor(public readonly phoneNumberId: string) {
    super("WhatsApp Business credential is missing an access token. Please reconnect the integration.");
    this.name = "WhatsAppTokenMissingError";
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type WhatsAppCredentialKey = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  obtained_at?: number;
};

type WhatsAppBusinessPhoneWithCredential = WhatsAppBusinessPhone & {
  credential: Credential;
};

type WhatsAppTemplate = Prisma.InputJsonValue;

export interface SyncWhatsappTemplatesResult {
  message: string;
  totalPhones: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: number;
    phoneNumberId: string;
    phoneNumber: string;
    success: boolean;
    error?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const GRAPH_API_VERSION = META_API_VERSION;
const TOKEN_EXPIRY_GRACE_PERIOD_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────
// Service implementation
// ─────────────────────────────────────────────────────────────────────────

export async function syncWhatsappTemplatesService(
  data: SyncWhatsappTemplatesData,
  prisma: PrismaClient,
  workflow: WorkflowContext
): Promise<SyncWhatsappTemplatesResult> {
  workflow.log("Starting WhatsApp template sync", "info");

  // ── Step 1: Fetch all WhatsApp Business phones ──────────────────────────
  const whatsappBusinessPhones = await workflow.run("fetch-whatsapp-phones", async () => {
    const phones = await prisma.whatsAppBusinessPhone.findMany({
      where: data.phoneNumberIds ? { phoneNumberId: { in: data.phoneNumberIds } } : undefined,
      include: {
        credential: true,
      },
    });

    workflow.log(`Found ${phones.length} WhatsApp Business phone(s) to sync`, "info");
    return phones;
  });

  if (whatsappBusinessPhones.length === 0) {
    workflow.log("No WhatsApp Business phones found, skipping sync", "info");
    return {
      message: "No WhatsApp Business phones found",
      totalPhones: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
    };
  }

  // ── Step 2: Sync templates for each phone ───────────────────────────────
  const results = await workflow.run("sync-all-templates", async () => {
    const syncResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (const phone of whatsappBusinessPhones) {
      try {
        workflow.log(`Syncing templates for phone ${phone.phoneNumber}`, "info");

        const templates = await syncTemplatesForPhone(phone, workflow);

        syncResults.push({
          id: phone.id,
          phoneNumberId: phone.phoneNumberId,
          phoneNumber: phone.phoneNumber,
          success: true,
        });

        successCount++;
        workflow.log(`Successfully synced templates for ${phone.phoneNumber}`, "info");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        syncResults.push({
          id: phone.id,
          phoneNumberId: phone.phoneNumberId,
          phoneNumber: phone.phoneNumber,
          success: false,
          error: errorMessage,
        });

        failureCount++;
        workflow.log(`Failed to sync templates for ${phone.phoneNumber}: ${errorMessage}`, "error");
      }
    }

    return { syncResults, successCount, failureCount };
  });

  workflow.log(
    `WhatsApp template sync completed: ${results.successCount} succeeded, ${results.failureCount} failed`,
    "info"
  );

  return {
    message: "WhatsApp template sync completed",
    totalPhones: whatsappBusinessPhones.length,
    successCount: results.successCount,
    failureCount: results.failureCount,
    results: results.syncResults,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────

async function syncTemplatesForPhone(
  whatsappBusinessPhone: WhatsAppBusinessPhoneWithCredential,
  workflow: WorkflowContext
): Promise<WhatsAppTemplate> {
  const credentialKey = (whatsappBusinessPhone.credential?.key || {}) as WhatsAppCredentialKey;
  const accessToken = credentialKey.access_token;

  if (!accessToken) {
    throw new WhatsAppTokenMissingError(whatsappBusinessPhone.phoneNumberId);
  }

  if (isTokenExpired(credentialKey)) {
    throw new WhatsAppTokenExpiredError(whatsappBusinessPhone.phoneNumberId);
  }

  // Fetch templates from Meta Graph API
  const templates = await fetchTemplatesFromGraph(accessToken, whatsappBusinessPhone.wabaId, workflow);

  // Update database with fetched templates
  await workflow.run(`update-templates-${whatsappBusinessPhone.phoneNumberId}`, async () => {
    const prisma = await import("@calcom/prisma").then((m) => m.prisma);

    await prisma.whatsAppBusinessPhone.update({
      where: { id: whatsappBusinessPhone.id },
      data: { templates },
    });

    return true;
  });

  return templates;
}

async function fetchTemplatesFromGraph(
  accessToken: string,
  wabaId: string,
  workflow: WorkflowContext
): Promise<WhatsAppTemplate> {
  workflow.log(`Fetching templates from Meta Graph API for WABA ${wabaId}`, "info");

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? "Failed to fetch WhatsApp Business templates.";
    workflow.log(`Graph API error: ${errorMessage}`, "error");
    throw new WhatsAppSyncError(errorMessage);
  }

  const templates = payload.data ?? [];
  workflow.log(`Fetched ${templates.length} template(s) from Graph API`, "info");

  return templates;
}

function isTokenExpired(credentialKey: WhatsAppCredentialKey): boolean {
  if (!credentialKey?.expires_in || !credentialKey.obtained_at) {
    return false;
  }

  const expiryTimestamp = credentialKey.obtained_at + credentialKey.expires_in * 1000;
  return Date.now() >= expiryTimestamp - TOKEN_EXPIRY_GRACE_PERIOD_MS;
}
