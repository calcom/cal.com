import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { DeelHrmsService } from "../lib/HrmsService";
import { appKeysSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["DeelWebhook"] });

export const config = {
  api: {
    bodyParser: false,
  },
};

const deelRequesterSchema = z.object({
  id: z.string(),
  name: z.string(),
  pic_url: z.string().nullable(),
  is_employee: z.boolean(),
});

const deelTimeOffResourceSchema = z.object({
  id: z.string(),
  contract_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  change_request: z.any().nullable(),
  applied_changes: z.array(z.any()),
  attachments: z.array(z.any()),
  reason: z.string().nullable(),
  type: z.string(),
  requested_at: z.string(),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED"]),
  requester: deelRequesterSchema,
  reviewer: z.any().nullable(),
  start_date_is_half_day: z.boolean(),
  end_date_is_half_day: z.boolean(),
  date_is_half_day: z.boolean(),
});

const deelWebhookMetaSchema = z.object({
  event_type_id: z.number(),
  public_id: z.string(),
  event_type: z.string(),
  tracking_id: z.string(),
  organization_id: z.number(),
  organization_name: z.string(),
  organization_public_id: z.string(),
});

const deelWebhookPayloadSchema = z.object({
  resource: deelTimeOffResourceSchema,
  meta: deelWebhookMetaSchema,
});

type DeelWebhookPayload = z.infer<typeof deelWebhookPayloadSchema>;

async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  try {
    const expectedSignature = createHmac("sha256", signingKey).update(`POST${rawBody}`).digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    log.error("Error verifying webhook signature", error);
    return false;
  }
}

async function findUserByDeelEmails(
  deelEmails: { type: string | null; value: string | null }[]
): Promise<{ id: number; email: string } | null> {
  for (const emailObj of deelEmails) {
    if (!emailObj.value) continue;

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: emailObj.value,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (user) {
      return user;
    }
  }

  return null;
}

async function findPolicyIdByTypeName(
  credential: any,
  typeName: string,
  userEmail: string
): Promise<string | null> {
  try {
    const hrmsService = new DeelHrmsService(credential);
    const reasons = await hrmsService.listOOOReasons(userEmail);

    const matchingReason = reasons.find((reason) => reason.name.toLowerCase() === typeName.toLowerCase());

    return matchingReason?.externalId || null;
  } catch (error) {
    log.error("Error finding policy ID by type name", { typeName, error });
    return null;
  }
}

async function handleTimeOffCreated(payload: DeelWebhookPayload): Promise<void> {
  const { resource } = payload;

  if (resource.status !== "APPROVED") {
    log.info("Ignoring time-off request with status", { status: resource.status });
    return;
  }

  const allCredentials = await prisma.credential.findMany({
    where: {
      app: {
        categories: {
          hasSome: [AppCategories.hrms],
        },
        slug: "deel",
      },
    },
    select: {
      id: true,
      key: true,
      appId: true,
      userId: true,
      teamId: true,
      type: true,
      invalid: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!allCredentials || allCredentials.length === 0) {
    log.warn("No Deel HRMS credentials found for processing webhook");
    return;
  }

  const rawCredential = allCredentials[0];
  const deelCredential = {
    ...rawCredential,
    delegationCredentialId: null,
  };

  const hrmsService = new DeelHrmsService(deelCredential);
  const userDetails = await hrmsService.getPersonById(resource.requester.id);

  if (!userDetails) {
    log.warn("Could not fetch user details from Deel", { requesterId: resource.requester.id });
    return;
  }

  const calUser = await findUserByDeelEmails(userDetails.emails);
  if (!calUser) {
    log.warn("No matching Cal.com user found for Deel user", {
      deelUserId: resource.requester.id,
      emails: userDetails.emails.map((e) => e.value).filter(Boolean),
    });
    return;
  }

  const policyId = await findPolicyIdByTypeName(deelCredential, resource.type, calUser.email);
  if (!policyId) {
    log.warn("Could not find policy ID for time-off type", { type: resource.type });
    return;
  }

  const reason = await prisma.outOfOfficeReason.upsert({
    where: {
      credentialId_externalId: {
        credentialId: deelCredential.id,
        externalId: policyId,
      },
    },
    create: {
      reason: resource.type,
      credentialId: deelCredential.id,
      externalId: policyId,
      enabled: true,
    },
    update: {
      reason: resource.type,
    },
  });

  const startDate = new Date(resource.start_date);
  const endDate = new Date(resource.end_date);

  await prisma.outOfOfficeEntry.create({
    data: {
      uuid: crypto.randomUUID(),
      start: startDate,
      end: endDate,
      notes: resource.reason || `Out of office: ${resource.type}`,
      userId: calUser.id,
      reasonId: reason.id,
      externalId: resource.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  log.info("Successfully created OOO entry from Deel webhook", {
    deelTimeOffId: resource.id,
    userId: calUser.id,
    startDate: resource.start_date,
    endDate: resource.end_date,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpError({ statusCode: 405, message: "Method Not Allowed" });
    }

    const rawBody = await getRawBody(req);
    const bodyAsString = rawBody.toString();
    const signature = req.headers["x-deel-signature"] as string;

    if (!signature) {
      throw new HttpError({ statusCode: 400, message: "Missing webhook signature" });
    }

    const appKeys = await getAppKeysFromSlug("deel");
    const parsedKeys = appKeysSchema.safeParse(appKeys);

    if (!parsedKeys.success) {
      throw new HttpError({ statusCode: 500, message: "Invalid app configuration" });
    }

    const { webhook_signing_key } = parsedKeys.data;

    if (!webhook_signing_key) {
      throw new HttpError({ statusCode: 500, message: "Webhook signing key not configured" });
    }

    const isValidSignature = await verifyWebhookSignature(bodyAsString, signature, webhook_signing_key);
    if (!isValidSignature) {
      throw new HttpError({ statusCode: 401, message: "Invalid webhook signature" });
    }

    const parseResult = deelWebhookPayloadSchema.safeParse(JSON.parse(bodyAsString));
    if (!parseResult.success) {
      log.error("Invalid webhook payload", parseResult.error);
      throw new HttpError({ statusCode: 400, message: "Invalid webhook payload" });
    }

    const payload = parseResult.data;

    if (payload.meta.event_type === "time-off.created") {
      await handleTimeOffCreated(payload);
    } else {
      log.info("Ignoring webhook event type", { eventType: payload.meta.event_type });
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    const err = getErrorFromUnknown(error);
    log.error("Webhook processing error", err);

    res.status(err instanceof HttpError ? err.statusCode : 500).json({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}
