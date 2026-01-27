import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";

import type { TResizeBase64ImageInputSchema } from "./resizeBase64Image.schema";

type ResizeBase64ImageOptions = {
  input: TResizeBase64ImageInputSchema;
};

const IMAGE_MAX_SIZES: Record<TResizeBase64ImageInputSchema["imageType"], number> = {
  logo: 96 * 4,
  banner: 1500,
};

export const resizeBase64ImageHandler = async ({ input }: ResizeBase64ImageOptions) => {
  const { image, imageType } = input;

  const maxSize = IMAGE_MAX_SIZES[imageType];
  const resizedImage = await resizeBase64Image(image, { maxSize });

  return { resizedImage };
};

export default resizeBase64ImageHandler;
