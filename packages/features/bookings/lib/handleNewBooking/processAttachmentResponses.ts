import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type z from "zod";

import { IS_DEV, WEBAPP_URL } from "@calcom/lib/constants";
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

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const processAttachmentResponses = async ({ responses, bookingFields }: ProcessAttachmentParams) => {
  if (!bookingFields) return responses;

  const updatedResponses = { ...responses };

  for (const field of bookingFields) {
    if (field.type !== "attachment") continue;
    const rawValue = responses[field.name];
    if (!rawValue) continue;

    if (Array.isArray(rawValue)) {
      const processedList = await Promise.all(
        rawValue.map((item) => storeAttachment(item as AttachmentValue))
      );
      updatedResponses[field.name] = processedList.filter(Boolean);
      continue;
    }

    const processed = await storeAttachment(rawValue as AttachmentValue);
    if (processed) {
      updatedResponses[field.name] = processed;
    }
  }

  return updatedResponses;
};

const storeAttachment = async (value: AttachmentValue) => {
  if (typeof value !== "object" || value === null) return null;

  // If it already has a URL and no new data payload, keep it as-is.
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
    if (IS_DEV) {
      const url = await saveToLocal(buffer, fileName);
      return {
        name: value.name || fileName,
        url,
        size: buffer.byteLength,
        type: value.type || mimeType,
      };
    }

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

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const getPublicDir = async () => {
  const cwdPublic = path.join(process.cwd(), "public");
  const webPublic = path.join(process.cwd(), "apps", "web", "public");

  try {
    await fs.stat(cwdPublic);
    return cwdPublic;
  } catch (_) {
    return webPublic;
  }
};

const saveToLocal = async (buffer: Buffer, fileName: string) => {
  const publicDir = await getPublicDir();
  const uploadDir = path.join(publicDir, "attachments");
  await ensureDir(uploadDir);

  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  const normalizedBase = WEBAPP_URL.replace(/\/$/, "");
  return `${normalizedBase}/attachments/${fileName}`;
};

const uploadToS3 = async (buffer: Buffer, fileName: string, contentType: string) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const customDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
  const prefix = process.env.AWS_S3_ATTACHMENTS_PREFIX || "attachments";

  if (!bucket || !region) {
    logger.warn("S3 bucket/region missing, falling back to local storage");
    return saveToLocal(buffer, fileName);
  }

  const client = new S3Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
  });

  const key = `${prefix}/${fileName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl = customDomain || `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${baseUrl}/${key}`;
};
