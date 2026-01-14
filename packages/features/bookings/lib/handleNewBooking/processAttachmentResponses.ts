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

const MAX_BYTES = 1 * 1024 * 1024; // 1MB

/**
 * Optimized S3 client and configuration management.
 * We cache the client and config to avoid redundant instantiations and env lookups.
 */
let s3Client: S3Client | null = null;
let s3Config: { bucket: string; deploymentEnv: string } | null = null;

const getS3Details = () => {
  if (s3Client && s3Config) return { client: s3Client, config: s3Config };

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const deploymentEnv = process.env.AWS_S3_ATTACHMENTS_ENV;

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !deploymentEnv) {
    throw new Error(
      "S3 configuration is missing. Ensure AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_ATTACHMENTS_ENV are set."
    );
  }

  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  s3Config = { bucket, deploymentEnv };
  return { client: s3Client, config: s3Config };
};

/**
 * Processes all attachment fields in booking responses.
 * Replaces base64 dataUrls with permanent S3 links.
 */
export const processAttachmentResponses = async ({ responses, bookingFields }: ProcessAttachmentParams) => {
  if (!bookingFields) return responses;

  const updatedResponses = { ...responses };
  const attachmentFields = bookingFields.filter((field) => field.type === "attachment");

  if (attachmentFields.length === 0) return responses;

  await Promise.all(
    attachmentFields.map(async (field) => {
      const rawValue = responses[field.name];
      if (!rawValue) return;

      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      const processedList = await Promise.all(values.map((item) => storeAttachment(item as AttachmentValue)));
      updatedResponses[field.name] = processedList.filter(Boolean);
    })
  );

  return updatedResponses;
};

/**
 * Stores a single attachment in S3 if it contains a dataUrl.
 * If only a url is provided, it assumes the file is already stored.
 */
const storeAttachment = async (value: AttachmentValue) => {
  if (typeof value !== "object" || value === null) return null;

  // If URL exists, file is already uploaded via FormData - return as-is (skip re-upload)
  if (value.url && typeof value.url === "string") {
    return value;
  }

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
    throw new Error(`Attachment exceeds maximum allowed size of ${MAX_BYTES / (1024 * 1024)}MB`);
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

/**
 * Uploads a buffer to S3 using the cached client.
 */
const uploadToS3 = async (buffer: Buffer, fileName: string, contentType: string) => {
  const { client, config } = getS3Details();

  const now = dayjs();
  const year = now.format("YYYY");
  const month = now.format("MM");
  const date = now.format("DD");
  const key = `${config.deploymentEnv}/${year}/${month}/${date}/attachments/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl = WEBAPP_URL;
  return `${baseUrl}/api/bookings/attachments?key=${encodeURIComponent(key)}`;
};
