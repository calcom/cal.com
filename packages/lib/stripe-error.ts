import { z } from "zod";

const errorSchema = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
});

export const stripeInvalidRequestErrorSchema = errorSchema.extend({
  type: z.literal("StripeInvalidRequestError"),
  rawType: z.literal("invalid_request_error"),
  code: z.string().optional(),
  doc_url: z.string().optional(),
  statusCode: z.number().optional(),
  raw: z.unknown(),
  headers: z.record(z.string()),
  requestId: z.string(),
  param: z.string().optional(),
});
