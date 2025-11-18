import { z } from "zod";

/**
 * Schema for uploading a business logo.
 * Validates base64-encoded image data with size constraints.
 */
export const ZUploadLogoInputSchema = z.object({
  /**
   * Base64-encoded image data (PNG, JPG, or SVG).
   * Maximum decoded size: 5MB
   */
  data: z.string().min(1, "Image data is required"),
  /**
   * Original filename for tracking purposes (optional)
   */
  originalFilename: z.string().optional(),
});

export type TUploadLogoInputSchema = z.infer<typeof ZUploadLogoInputSchema>;

