import { z } from "zod";

/** @see https://github.com/colinhacks/zod/issues/3155#issuecomment-2060045794 */
export const emailRegex =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.']*)[A-Z0-9_+'-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

/**
 * RFC 5321 Section 4.5.3.1.3 specifies:
 * - Maximum email address length: 254 characters
 * - Local part (before @): max 64 characters
 * - Domain part (after @): max 253 characters
 */
const MAX_EMAIL_LENGTH = 254;

export const emailSchema = z
  .string()
  .max(MAX_EMAIL_LENGTH, { message: "Email address is too long" })
  .regex(emailRegex);
