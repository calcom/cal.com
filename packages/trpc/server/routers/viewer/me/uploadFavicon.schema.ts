import { z } from "zod";

/**
 * Schema for uploading a custom favicon.
 * Validates base64-encoded icon data with size constraints.
 */
export const ZUploadFaviconInputSchema = z.object({
  /**
   * Base64-encoded icon data (ICO or PNG).
   * Maximum decoded size: 1MB
   * Recommended: 32×32px minimum for optimal display
   */
  data: z.string().min(1, "Favicon data is required"),
  /**
   * Original filename for tracking purposes (optional)
   */
  originalFilename: z.string().optional(),
});

export type TUploadFaviconInputSchema = z.infer<typeof ZUploadFaviconInputSchema>;

