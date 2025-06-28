import { z } from "zod";

// Copied from node_modules/stripe/types/Errors.d.ts because stripe lib doesn't expose these types
// Ref: https://github.com/stripe/stripe-node/blob/master/types/Errors.d.ts#L194
interface StripeInvalidRequestError extends Error {
  readonly type: "StripeInvalidRequestError";
  readonly rawType: "invalid_request_error";
  /**
   * A human-readable message giving more details about the error. For card errors, these messages can
   * be shown to your users.
   */
  readonly message: string;
  /**
   * For card errors, a short string describing the kind of card error that occurred.
   *
   * @docs https://stripe.com/docs/error-codes
   */
  readonly code?: string;

  /**
   * A URL to more information about the error code reported.
   *
   * @docs https://stripe.com/docs/error-codes
   */
  readonly doc_url?: string;

  /**
   * Typically a 4xx or 5xx.
   */
  readonly statusCode?: number;

  readonly raw: unknown;

  readonly headers: {
    [key: string]: string;
  };

  readonly requestId: string;

  /**
   * The parameter the error relates to if the error is parameter-specific. You can use this to display a
   * message near the correct form field, for example.
   */
  readonly param?: string;
}

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
