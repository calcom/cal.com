import { z } from "zod";

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

// Schema for tracking IDs that should only contain letters, numbers, underscores, and hyphens
export const alphanumericIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[A-Za-z0-9_-]+$/.test(val), {
    message: "Invalid ID format. Expected alphanumeric characters, underscores, or hyphens",
  });

// Schema for tracking IDs that should only contain digits
export const numericIdSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => !val || /^[0-9]+$/.test(val), {
    message: "Invalid ID format. Expected a numeric ID",
  });

// Factory for creating prefixed ID schemas (GTM, GA4, Fathom, etc.)
export const createPrefixedIdSchema = (options: {
  prefix?: string;
  addPrefixIfMissing?: boolean;
  allowEmpty?: boolean;
}) => {
  const { prefix = "", addPrefixIfMissing = false, allowEmpty = true } = options;

  return z
    .string()
    .transform((val) => {
      let result = val.trim().toUpperCase();
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
