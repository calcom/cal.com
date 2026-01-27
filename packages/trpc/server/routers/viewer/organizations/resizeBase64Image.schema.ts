import { z } from "zod";

const base64ImageSchema = z
  .string()
  .min(1, "Image is required")
  .refine(
    (value) =>
      value.startsWith("data:image/png;base64,") ||
      value.startsWith("data:image/jpeg;base64,") ||
      value.startsWith("data:image/jpg;base64,"),
    {
      message: "Invalid image format. Only PNG and JPEG images are supported.",
    }
  );

export const ZResizeBase64ImageInputSchema = z.object({
  image: base64ImageSchema,
  imageType: z.enum(["logo", "banner"]),
});

export type TResizeBase64ImageInputSchema = z.infer<typeof ZResizeBase64ImageInputSchema>;
