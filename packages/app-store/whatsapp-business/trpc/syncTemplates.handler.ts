import type { createStepTools } from "inngest/components/InngestStepTools";
import type { Logger } from "inngest/middleware/logger";

import { META_API_VERSION } from "@calcom/lib/constants";
import { INNGEST_ID } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Credential, Prisma, PrismaClient, WhatsAppBusinessPhone } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import { TRPCError } from "@trpc/server";

import type { TSyncTemplatesInputSchema } from "./syncTemplates.schema";

interface SyncTemplatesHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSyncTemplatesInputSchema;
}

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

type SyncTemplatesResponse = {
  message: string;
};

type SyncTemplatesResult = {
  id: number;
  phoneNumberId: string;
  phoneNumber: string;
  templates: WhatsAppTemplate;
};

const GRAPH_API_VERSION = META_API_VERSION;
const TOKEN_EXPIRY_GRACE_PERIOD_MS = 5 * 60 * 1000;

export const syncTemplatesHandler = async ({
  ctx,
  input,
}: SyncTemplatesHandlerOptions): Promise<SyncTemplatesResponse> => {
  const { phoneNumberId } = input;
  return await syncTemplateByPhoneNumberId(phoneNumberId);
};

const syncTemplateByPhoneNumberId = async (phoneNumberId: string) => {
  const whatsappBusinessPhone = await prisma.whatsAppBusinessPhone.findFirst({
    where: {
      phoneNumberId,
    },
    include: {
      credential: true,
    },
  });

  const templates = await syncTemplatesForPhone(whatsappBusinessPhone);
  return {
    id: whatsappBusinessPhone.id,
    phoneNumberId: whatsappBusinessPhone.phoneNumberId,
    phoneNumber: whatsappBusinessPhone.phoneNumber,
    templates,
  };
};

export const syncTemplates = async ({ step, logger }): Promise<SyncTemplatesResult[]> => {
  // Sync templates of all phone numbers associated with the WhatsApp Business phone records
  const whatsappBusinessPhones = await prisma.whatsAppBusinessPhone.findMany({
    include: {
      credential: true,
    },
  });

  if (!whatsappBusinessPhones.length) {
    return [];
  }

  const results: SyncTemplatesResult[] = [];

  for (const whatsappBusinessPhone of whatsappBusinessPhones) {
    const templates = await syncTemplatesForPhone(whatsappBusinessPhone);
    results.push({
      id: whatsappBusinessPhone.id,
      phoneNumberId: whatsappBusinessPhone.phoneNumberId,
      phoneNumber: whatsappBusinessPhone.phoneNumber,
      templates,
    });
  }

  return results;
};

async function syncTemplatesForPhone(
  whatsappBusinessPhone: WhatsAppBusinessPhoneWithCredential
): Promise<WhatsAppTemplate> {
  const credentialKey = (whatsappBusinessPhone.credential?.key || {}) as WhatsAppCredentialKey;
  const accessToken = credentialKey.access_token;

  if (!accessToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "WhatsApp Business credential is missing an access token. Please reconnect the integration.",
    });
  }

  if (isTokenExpired(credentialKey)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "WhatsApp Business access token has expired. Please reconnect the integration.",
    });
  }

  const templates = await fetchTemplatesFromGraph(accessToken, whatsappBusinessPhone.wabaId);

  await prisma.whatsAppBusinessPhone.update({
    where: {
      id: whatsappBusinessPhone.id,
    },
    data: {
      templates,
    },
  });

  return templates;
}

async function fetchTemplatesFromGraph(accessToken: string, wabaId: string): Promise<WhatsAppTemplate> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? "Failed to fetch WhatsApp Business templates.";
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: errorMessage,
    });
  }

  return payload.data ?? [];
}

function isTokenExpired(credentialKey: WhatsAppCredentialKey) {
  if (!credentialKey?.expires_in || !credentialKey.obtained_at) {
    return false;
  }

  const expiryTimestamp = credentialKey.obtained_at + credentialKey.expires_in * 1000;
  return Date.now() >= expiryTimestamp - TOKEN_EXPIRY_GRACE_PERIOD_MS;
}
