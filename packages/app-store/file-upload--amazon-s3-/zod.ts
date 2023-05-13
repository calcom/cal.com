import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    awsAccessKeyId: z.string().min(1).optional(),
    awsSecretAccessId: z.string().min(1).optional(),
    s3Region: z.string().min(1).optional(),
    s3Bucket: z.string().min(1).optional(),
  })
);

export const appKeysSchema = z.object({});
