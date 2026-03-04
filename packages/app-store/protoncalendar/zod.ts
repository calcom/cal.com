import { z } from "zod";

/**
 * Validates Proton ICS feed URL with SSRF protection
 * Only allows HTTPS URLs from proton.me domain
 */
const protonIcsUrlSchema = z.string().url()
  .refine((url) => url.startsWith('https://'), {
    message: "Only HTTPS URLs are allowed for security reasons"
  })
  .refine((url) => {
    try {
      const parsed = new URL(url);
      // Only allow proton.me domains
      return parsed.hostname.endsWith('.proton.me') || parsed.hostname.endsWith('.protonmail.com');
    } catch {
      return false;
    }
  }, {
    message: "URL must be a valid Proton Calendar ICS feed URL (proton.me or protonmail.com)"
  });

export const appKeysSchema = z.object({
  protonIcsFeedUrl: protonIcsUrlSchema.optional(),
});

export const appDataSchema = z.object({});
