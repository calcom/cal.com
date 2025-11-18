import { TRPCError } from "@trpc/server";

import { uploadUserFavicon } from "@calcom/lib/server/avatar";
import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TUploadFaviconInputSchema } from "./uploadFavicon.schema";

type UploadFaviconOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUploadFaviconInputSchema;
};

/**
 * Handler for uploading a custom favicon.
 * Validates file size (max 1MB decoded), uploads to Avatar table,
 * and updates user metadata with favicon reference.
 */
export const uploadFaviconHandler = async ({ ctx, input }: UploadFaviconOptions) => {
  const { user } = ctx;
  const { data, originalFilename } = input;

  // Validate base64 data and estimate decoded size
  // Base64 encoding increases size by ~33%, so we check encoded size
  const estimatedSize = (data.length * 3) / 4;
  const maxSize = 1 * 1024 * 1024; // 1MB

  if (estimatedSize > maxSize) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Favicon file size exceeds maximum allowed size of 1MB",
    });
  }

  // Validate that it's a data URL (starts with data:image/)
  if (!data.startsWith("data:image/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid icon format. Please upload an ICO or PNG image.",
    });
  }

  try {
    // Upload favicon to Avatar table and get URL
    const faviconUrl = await uploadUserFavicon(user.id, data);

    // Extract objectKey from URL (format: /api/avatar/{objectKey}.png)
    const objectKey = faviconUrl.split("/").pop()?.replace(".png", "") || "";

    // Update user metadata with favicon information
    const currentMetadata = userMetadataSchema.parse(user.metadata);
    const updatedMetadata = {
      ...currentMetadata,
      favicon: {
        objectKey,
        uploadedAt: new Date().toISOString(),
        originalFilename: originalFilename || "favicon.ico",
      },
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { metadata: updatedMetadata },
    });

    return {
      success: true,
      objectKey,
      url: faviconUrl,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload favicon. Please try again.",
      cause: error,
    });
  }
};

