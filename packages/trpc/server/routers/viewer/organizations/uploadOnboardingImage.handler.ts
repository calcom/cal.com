import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { convertSvgToPng } from "@calcom/lib/server/imageUtils";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { prisma } from "@calcom/prisma";
import { v4 as uuidv4 } from "uuid";
import type { TrpcSessionUser } from "../../../types";
import type { TUploadOnboardingImageSchema } from "./uploadOnboardingImage.schema";

type UploadOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUploadOnboardingImageSchema;
};

export const uploadOnboardingImageHandler = async ({ input, ctx }: UploadOptions) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `uploadOnboardingImage:${ctx.user.id}`,
  });

  const isBanner = input.type === "banner";
  const maxSize = isBanner ? 1500 : undefined;

  const resized = await resizeBase64Image(input.imageData, maxSize ? { maxSize } : undefined);
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(resized);

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner: {
        teamId: 0,
        userId: ctx.user.id,
        isBanner,
      },
    },
    create: {
      userId: ctx.user.id,
      data: processedData,
      objectKey,
      isBanner,
    },
    update: {
      data: processedData,
      objectKey,
    },
  });

  return { url: `/api/avatar/${objectKey}.png` };
};

export default uploadOnboardingImageHandler;
