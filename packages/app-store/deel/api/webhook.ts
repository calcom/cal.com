import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { PrismaOOORepository } from "@calcom/features/ooo/repositories/PrismaOOORepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";
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
  is_employee: z.boolean(),
  work_email: z.string().nullable(),
});

const deelTimeOffResourceSchema = z.object({
  id: z.string(),
  contract_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  change_request: z.any().nullable(),
  reason: z.string().nullable(),
  type: z.string(),
  requested_at: z.string(),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "CANCELED", "USED"]),
  requester: deelRequesterSchema,
  reviewer: z.any().nullable(),
  start_date_is_half_day: z.boolean(),
  end_date_is_half_day: z.boolean(),
  date_is_half_day: z.boolean(),
});

const deelWebhookMetaSchema = z.object({
  event_type_id: z.string(),
  event_type: z.string(),
  tracking_id: z.string(),
  organization_id: z.string(),
  organization_name: z.string(),
});

const deelWebhookPayloadSchema = z.object({
  data: z.object({
    resource: deelTimeOffResourceSchema,
    meta: deelWebhookMetaSchema,
  }),
  timestamp: z.string(),
});

async function verifyWebhookSignature(
  rawBody: Buffer<ArrayBufferLike>,
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
    const rawBody = await getRawBody(req);
    const bodyAsString = rawBody.toString();

    const signature = req.headers["x-deel-signature"] as string;
    if (!signature) {
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    const appKeys = await getAppKeysFromSlug("deel");
    const parsedKeys = appKeysSchema.safeParse(appKeys);
    if (!parsedKeys.success) {
      return res.status(500).json({ message: "Invalid app configuration" });
    }

    const { webhook_signing_key } = parsedKeys.data;
    if (!webhook_signing_key) {
      return res.status(500).json({ message: "Webhook signing key not configured" });
    }

    const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhook_signing_key);
    if (!isValidSignature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const parseResult = deelWebhookPayloadSchema.safeParse(JSON.parse(bodyAsString));
    if (!parseResult.success) {
      console.log(parseResult.error.errors);
      log.error("Invalid webhook payload", safeStringify(parseResult.error));
      return res.status(400).json({ statusCode: 400, message: "Invalid webhook payload" });
    }

    const payload = parseResult.data.data;
    if (payload.meta.event_type === "time-off.created" || payload.meta.event_type === "time-off.reviewed") {
      if (payload.resource.status !== "APPROVED")
        return res.status(200).json({ message: "Time-off not approved, skipping processing" });

      const email = payload.resource.requester.work_email;
      if (!email) {
        log.warn("No work email provided in Deel webhook payload", safeStringify(payload));
        return res.status(200).json({ message: "No work email provided, skipping processing" });
      }

      const userRepo = new UserRepository(prisma);
      const user = await userRepo.findByEmailCaseInsensitive({ email });
      if (!user) {
        log.warn("No matching Cal.com user found for Deel webhook", { email });
        return res.status(200).json({ message: "No matching user found, skipping processing" });
      }

      const oooRepo = new PrismaOOORepository(prisma);
      const existingOOO = await oooRepo.findUserOOODays({
        userId: user.id,
        dateFrom: payload.resource.start_date,
        dateTo: payload.resource.end_date,
      });
      if (existingOOO && existingOOO.length > 0) {
        log.info("OOO entry already exists for user and date range, skipping creation", {
          userId: user.id,
          dateFrom: payload.resource.start_date,
          dateTo: payload.resource.end_date,
          work_email: email,
        });
        return res.status(200).json({ message: "OOO entry already exists, skipping creation" });
      }

      const allCredentials = await CredentialRepository.findCredentialsByUserIdAndCategory({
        category: [AppCategories.hrms],
        userId: user.id,
      });
      if (!allCredentials || allCredentials.length === 0) {
        log.warn("No Deel HRMS credentials found for processing webhook");
        return res.status(200).json({ message: "No Deel HRMS credentials found, skipping processing" });
      }

      const deelCredential = allCredentials.find((cred) => cred.appId === "deel");
      if (!deelCredential) {
        log.warn("No Deel HRMS credential found for processing webhook");
        return res.status(200).json({ message: "No Deel HRMS credential found, skipping processing" });
      }

      const deelService = new DeelHrmsService(deelCredential);
      const policies = await deelService.listOOOReasons(email);
      const matchingPolicy = policies.find(
        (policy) => policy.name.toLowerCase() === payload.resource.type.toLowerCase()
      );

      const oooEntry = await oooRepo.createOOOEntry({
        end: new Date(payload.resource.end_date),
        start: new Date(payload.resource.start_date),
        notes: payload.resource.reason || "Synced from Deel",
        userId: user.id,
        uuid: crypto.randomUUID(),
        reasonId: 1,
      });

      await oooRepo.createOOOReference({
        oooEntryId: oooEntry.id,
        source: "deel",
        externalId: payload.resource.id,
        externalReasonId: matchingPolicy?.externalId || null,
        externalReasonName: payload.resource.type,
        credentialId: deelCredential.id,
      });
    } else if (payload.meta.event_type === "time-off.updated") {
      const oooRepo = new PrismaOOORepository(prisma);

      if (payload.resource.status === "CANCELED") {
        await oooRepo.deleteOOOEntryByExternalReference({
          source: "deel",
          externalId: payload.resource.id,
        });
      } else if (payload.resource.status === "APPROVED") {
        const reference = await oooRepo.findOOOEntryByExternalReference({
          source: "deel",
          externalId: payload.resource.id,
        });

        if (!reference?.oooEntry || !reference.credential) {
          log.warn("No existing OOO entry found to update for external ID", {
            externalId: payload.resource.id,
          });
          return res.status(200).json({ message: "No existing OOO entry found, skipping update" });
        }

        const deelService = new DeelHrmsService({ ...reference.credential, delegationCredentialId: null });
        const policies = await deelService.listOOOReasons(payload.resource.requester.work_email);
        const matchingPolicy = policies.find(
          (policy) => policy.name.toLowerCase() === payload.resource.type.toLowerCase()
        );

        await oooRepo.updateOOOEntry({
          uuid: reference.oooEntry.uuid,
          start: new Date(payload.resource.start_date),
          end: new Date(payload.resource.end_date),
          notes: payload.resource.reason || "Synced from Deel",
          reasonId: 1,
          userId: reference.oooEntry.userId,
        });

        await prisma.outOfOfficeReference.update({
          where: { id: reference.id },
          data: {
            externalReasonId: matchingPolicy?.externalId || null,
            externalReasonName: payload.resource.type,
            syncedAt: new Date(),
          },
        });
      }
    } else {
      log.info("Ignoring deel incoming webhook", safeStringify(payload));
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    const err = getErrorFromUnknown(error);
    log.error("Webhook processing error", safeStringify(err));

    res.status(err instanceof HttpError ? err.statusCode : 500).json({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}
