import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";

import { TRPCError } from "@trpc/server";

import type { TResizeOnboardingImageInputSchema } from "./resizeOnboardingImage.schema";

type ResizeOnboardingImageOptions = {
  input: TResizeOnboardingImageInputSchema;
};

export const resizeOnboardingImageHandler = async ({ input }: ResizeOnboardingImageOptions) => {
  const { image, isBanner } = input;

  if (
    !image.startsWith("data:image/png;base64,") &&
    !image.startsWith("data:image/jpeg;base64,") &&
    !image.startsWith("data:image/jpg;base64,")
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image format. Only PNG and JPEG images are supported.",
    });
  }

  const maxSize = isBanner ? 1500 : 96 * 4;
  const resizedImage = await resizeBase64Image(image, { maxSize });

  return { resizedImage };
};

export default resizeOnboardingImageHandler;
