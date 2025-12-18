import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type z from "zod";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type AttachmentValue = {
  name?: string;
  url?: string;
  dataUrl?: string;
  size?: number;
  type?: string;
};

type ProcessAttachmentParams = {
  responses: Record<string, unknown>;
  bookingFields: z.infer<typeof eventTypeBookingFields> | null;
};

const MAX_BYTES = 1 * 1024 * 1024;

export const processAttachmentResponses = async ({ responses, bookingFields }: ProcessAttachmentParams) => {
  if (!bookingFields) return responses;

  const updatedResponses = { ...responses };

  for (const field of bookingFields) {
    if (field.type !== "attachment") continue;
    const rawValue = responses[field.name];
    if (!rawValue) continue;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const processedList = await Promise.all(values.map((item) => storeAttachment(item as AttachmentValue)));
    updatedResponses[field.name] = processedList.filter(Boolean);
  }

  return updatedResponses;
};

const storeAttachment = async (value: AttachmentValue) => {
  if (typeof value !== "object" || value === null) return null;
  if (value.url && !value.dataUrl) return value;

  const dataUrl = value.dataUrl;
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!matches) {
    logger.warn("Unable to parse attachment data URL");
    return null;
  }

  const [, mimeType, base64Data] = matches;
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("Attachment exceeds maximum allowed size");
  }

  const fileName = `${randomUUID()}-${(value.name || "attachment").replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

  try {
    const url = await uploadToS3(buffer, fileName, mimeType);
    return {
      name: value.name || fileName,
      url,
      size: buffer.byteLength,
      type: value.type || mimeType,
    };
  } catch (error) {
    logger.error("Failed to store attachment", error);
    throw error;
  }
};

const uploadToS3 = async (buffer: Buffer, fileName: string, contentType: string) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const deploymentEnv = process.env.AWS_S3_ATTACHMENTS_ENV;

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !deploymentEnv) {
    throw new Error("S3 configuration is missing");
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const now = dayjs();
  const year = now.format("YYYY");
  const month = now.format("MM");
  const date = now.format("DD");
  const key = `${deploymentEnv}/${year}/${month}/${date}/attachments/${fileName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl = WEBAPP_URL;
  return `${baseUrl}/api/bookings/attachments?key=${encodeURIComponent(key)}`;
};
