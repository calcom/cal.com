import { z } from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    s3Region: z.string(),
    s3Bucket: z.string(),
  })
);
export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const queryParamSchema = z.object({
  bucket: z.string().min(1),
  region: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  credentialId: z.number(),
});

export type QueryParamSchemaT = z.infer<typeof queryParamSchema>;
