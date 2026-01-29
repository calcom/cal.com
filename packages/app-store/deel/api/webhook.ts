import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import { UserRepository } from "@calcom/lib/server/repository/user";
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

      if (!matchingPolicy) {
        log.warn("No matching OOO policy found in Deel for type", { type: payload.resource.type, email });
        return res.status(200).json({ message: "No matching OOO policy found, skipping processing" });
      }

      const reason = await oooRepo.upsertOOOReason({
        credentialId: deelCredential.id,
        externalId: matchingPolicy.externalId,
        reason: matchingPolicy.name,
        enabled: true,
      });

      await oooRepo.createOOOEntry({
        end: new Date(payload.resource.end_date),
        start: new Date(payload.resource.start_date),
        externalId: payload.resource.id,
        notes: payload.resource.reason || "Synced from Deel",
        userId: user.id,
        uuid: crypto.randomUUID(),
        reasonId: reason.id,
      });
    } else if (payload.meta.event_type === "time-off.updated") {
      if (payload.resource.status === "CANCELED") {
        const oooRepo = new PrismaOOORepository(prisma);
        await oooRepo.deleteOOOEntryByExternalId({ externalId: payload.resource.id });
      } else if (payload.resource.status === "APPROVED") {
        const oooRepo = new PrismaOOORepository(prisma);
        const ooo = await oooRepo.findOOOEntryByExternalId(payload.resource.id);

        if (!ooo || !ooo.reason?.credential) {
          log.warn("No existing OOO entry found to update for external ID", {
            externalId: payload.resource.id,
          });
          return res.status(200).json({ message: "No existing OOO entry found, skipping update" });
        }

        const deelService = new DeelHrmsService(ooo.reason.credential);
        const policies = await deelService.listOOOReasons(
          payload.resource.requester.work_email,
          payload.resource.requester.id
        );
        const matchingPolicy = policies.find(
          (policy) => policy.name.toLowerCase() === payload.resource.type.toLowerCase()
        );

        if (!matchingPolicy) {
          log.warn("No matching OOO policy found in Deel for type", { type: payload.resource.type });
          return res.status(200).json({ message: "No matching OOO policy found, skipping processing" });
        }

        const reason = await oooRepo.upsertOOOReason({
          credentialId: ooo.reason.credential.id,
          externalId: matchingPolicy.externalId,
          reason: matchingPolicy.name,
          enabled: true,
        });

        await oooRepo.updateOOOEntry({
          uuid: ooo.uuid,
          start: new Date(payload.resource.start_date),
          end: new Date(payload.resource.end_date),
          notes: payload.resource.reason || "Synced from Deel",
          reasonId: reason.id,
          userId: ooo.userId,
          externalId: payload.resource.id,
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
