import { z } from "zod";

/**
 * Helper to create schemas that accept nullish values but always output string.
 * Used for tracking IDs that may be null/undefined in the database.
 */
const nullishString = () =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val): string => (typeof val === "string" ? val.trim() : ""));

// URL schema: string input, validates http/https (kept as original to maintain type compatibility)
export const safeUrlSchema = z
  .string()
  .transform((val) => val.trim())
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Invalid URL format. Must be a valid http or https URL" }
  );

// Alphanumeric ID schema - accepts nullish for tracking IDs
export const alphanumericIdSchema = nullishString().refine(
  (val) => !val || /^[A-Za-z0-9_-]+$/.test(val),
  { message: "Invalid ID format. Expected alphanumeric characters, underscores, or hyphens" }
);

// Numeric ID schema - accepts nullish for tracking IDs
export const numericIdSchema = nullishString().refine(
  (val) => !val || /^[0-9]+$/.test(val),
  { message: "Invalid ID format. Expected a numeric ID" }
);

// Factory for prefixed ID schemas (GTM-, G-, etc.)
export const createPrefixedIdSchema = (options: {
  prefix?: string;
  addPrefixIfMissing?: boolean;
  allowEmpty?: boolean;
}) => {
  const { prefix = "", addPrefixIfMissing = false, allowEmpty = true } = options;

  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val): string => {
      if (typeof val !== "string") return "";
      let result = val.trim().toUpperCase();
      if (!result) return result;
      if (prefix && addPrefixIfMissing) {
        const clean = result.replace(new RegExp(`^${prefix}`, "i"), "");
        result = `${prefix}${clean}`;
      }
      return result;
    })
    .refine(
      (val) => {
        if (allowEmpty && val === "") return true;
        const pattern = prefix ? new RegExp(`^${prefix}[A-Z0-9]{1,20}$`) : /^[A-Z0-9]{1,20}$/;
        return pattern.test(val);
      },
      { message: `Invalid ID format${prefix ? `. Expected: ${prefix}XXXXXX` : ""}` }
    );
};
