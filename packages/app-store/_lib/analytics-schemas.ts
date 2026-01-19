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
