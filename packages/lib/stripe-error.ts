import { z } from "zod";

export const stripeInvalidRequestErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
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
