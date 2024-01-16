import type { Prisma } from "@prisma/client";

import { renameDomain } from "@calcom/lib/domainManager/organization";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminUpdate } from "./adminUpdate.schema";

type AdminUpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdate;
};

export const adminUpdateHandler = async ({ input }: AdminUpdateOptions) => {
  const { id, ...restInput } = input;
  const existingOrg = await prisma.team.findUnique({
    where: {
      id: id,
    },
  });

  if (!existingOrg) {
    throw new HttpError({
      message: "Organization not found",
      statusCode: 404,
    });
  }

  const { mergeMetadata } = getMetadataHelpers(teamMetadataSchema.unwrap(), existingOrg.metadata);
  const data: Prisma.TeamUpdateArgs["data"] = {
    ...restInput,
    metadata: mergeMetadata({ ...restInput.metadata }),
  };

  if (restInput.slug) {
    await throwIfSlugConflicts({ id, slug: restInput.slug });
    const isSlugChanged = restInput.slug !== existingOrg.slug;
    if (isSlugChanged) {
      // If slug is changed, we need to rename the domain first
      // If renaming fails, we don't want to update the new slug in DB
      await renameDomain(existingOrg.slug, restInput.slug);
    }
    data.slug = input.slug;
    data.metadata = mergeMetadata({
      // If we save slug, we don't need the requestedSlug anymore
      requestedSlug: undefined,
      ...input.metadata,
    });
  }

  const updatedOrganisation = await prisma.team.update({
    where: { id },
    data,
  });

  return updatedOrganisation;
};

export default adminUpdateHandler;

async function throwIfSlugConflicts({ id, slug }: { id: number; slug: string }) {
  const organizationsWithSameSlug = await prisma.team.findMany({
    where: {
      slug: slug,
      parentId: null,
    },
  });

  if (organizationsWithSameSlug.length > 1) {
    throw new HttpError({
      message: "There can only be one organization with a given slug",
      statusCode: 400,
    });
  }

  const foundOrg = organizationsWithSameSlug[0];
  if (!foundOrg) {
    // No org with same slug found - So, no conflict.
    return;
  }

  // If foundOrg isn't same as the org being edited
  if (foundOrg.id !== id) {
    throw new HttpError({
      message: "Organization with same slug already exists",
      statusCode: 400,
    });
  }
}
