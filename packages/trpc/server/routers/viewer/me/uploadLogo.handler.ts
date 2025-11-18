import { TRPCError } from "@trpc/server";

import { uploadUserLogo } from "@calcom/lib/server/avatar";
import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TUploadLogoInputSchema } from "./uploadLogo.schema";

type UploadLogoOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUploadLogoInputSchema;
};

/**
 * Handler for uploading a business logo.
 * Validates file size (max 5MB decoded), uploads to Avatar table,
 * and updates user metadata with logo reference.
 */
export const uploadLogoHandler = async ({ ctx, input }: UploadLogoOptions) => {
  const { user } = ctx;
  const { data, originalFilename } = input;

  // Validate base64 data and estimate decoded size
  // Base64 encoding increases size by ~33%, so we check encoded size
  const estimatedSize = (data.length * 3) / 4;
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (estimatedSize > maxSize) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo file size exceeds maximum allowed size of 5MB",
    });
  }

  // Validate that it's a data URL (starts with data:image/)
  if (!data.startsWith("data:image/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid image format. Please upload a PNG, JPG, or SVG image.",
    });
  }

  try {
    // Upload logo to Avatar table and get URL
    const logoUrl = await uploadUserLogo(user.id, data);

    // Extract objectKey from URL (format: /api/avatar/{objectKey}.png)
    const objectKey = logoUrl.split("/").pop()?.replace(".png", "") || "";

    // Update user metadata with logo information
    const currentMetadata = userMetadataSchema.parse(user.metadata);
    const updatedMetadata = {
      ...currentMetadata,
      businessLogo: {
        objectKey,
        uploadedAt: new Date().toISOString(),
        originalFilename: originalFilename || "logo.png",
      },
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { metadata: updatedMetadata },
    });

    return {
      success: true,
      objectKey,
      url: logoUrl,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload logo. Please try again.",
      cause: error,
    });
  }
};

