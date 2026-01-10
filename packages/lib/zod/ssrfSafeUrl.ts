import type { z } from "zod";
import { z as zod } from "zod";

import { validateUrlForSSRFSync } from "../ssrfProtection";

/**
 * Zod schema for validating user-provided URLs before server-side fetching
 *
 * Applies synchronous SSRF checks only (no DNS resolution or rebinding)
 * The logo route adds async DNS validation as defense-in-depth
 */
export const ssrfSafeUrlSchema: z.ZodEffects<z.ZodString, string, string> = zod.string().refine(
  (url) => {
    const result = validateUrlForSSRFSync(url);
    return result.isValid;
  },
  { message: "URL is not allowed for security reasons" }
);

/**
 * Optional nullable variant for update schemas
 * Allows null/undefined while validating provided values
 */
export const optionalSsrfSafeUrlSchema: z.ZodEffects<
  z.ZodOptional<z.ZodNullable<z.ZodString>>,
  string | null | undefined,
  string | null | undefined
> = zod
  .string()
  .nullable()
  .optional()
  .refine(
    (url) => {
      if (url == null || url === "") return true; // null/undefined/empty allowed
      return validateUrlForSSRFSync(url).isValid;
    },
    { message: "URL is not allowed for security reasons" }
  );
