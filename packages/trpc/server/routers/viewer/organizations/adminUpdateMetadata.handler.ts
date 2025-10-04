import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdateMetadataSchema } from "./adminUpdateMetadata.schema";

type AdminUpdateMetadataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateMetadataSchema;
};

const ALLOWED_METADATA_KEYS = ["paymentId", "subscriptionId", "subscriptionItemId"];

export const adminUpdateMetadataHandler = async ({ input }: AdminUpdateMetadataOptions) => {
  const { id, metadata } = input;

  const existingOrg = await prisma.team.findUnique({
    where: {
      id: id,
      isOrganization: true,
    },
  });

  if (!existingOrg) {
    throw new HttpError({
      message: "Organization not found",
      statusCode: 404,
    });
  }

  const invalidKeys = Object.keys(metadata).filter((key) => !ALLOWED_METADATA_KEYS.includes(key));
  if (invalidKeys.length > 0) {
    throw new HttpError({
      message: `Invalid metadata keys: ${invalidKeys.join(", ")}. Only ${ALLOWED_METADATA_KEYS.join(", ")} can be updated.`,
      statusCode: 400,
    });
  }

  const { mergeMetadata } = getMetadataHelpers(
    teamMetadataStrictSchema.unwrap(),
    existingOrg.metadata || {}
  );

  const processedMetadata: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "subscriptionId" || key === "subscriptionItemId") {
      processedMetadata[key] = value === "" ? null : value;
    } else {
      processedMetadata[key] = value;
    }
  }

  const updatedOrganization = await prisma.team.update({
    where: { id },
    data: {
      metadata: mergeMetadata(processedMetadata),
    },
  });

  return updatedOrganization;
};

export default adminUpdateMetadataHandler;
