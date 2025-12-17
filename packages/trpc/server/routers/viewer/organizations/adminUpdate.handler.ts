import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { renameDomain } from "@calcom/lib/domainManager/organization";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdate } from "./adminUpdate.schema";

type AdminUpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdate;
};

export const adminUpdateHandler = async ({ input }: AdminUpdateOptions) => {
  const { id, organizationSettings, ...restInput } = input;
  const organizationRepository = getOrganizationRepository();
  const existingOrg = await organizationRepository.adminFindByIdForUpdate({ id });

  if (!existingOrg) {
    throw new HttpError({
      message: "Organization not found",
      statusCode: 404,
    });
  }

  const { mergeMetadata } = getMetadataHelpers(teamMetadataStrictSchema.unwrap(), existingOrg.metadata || {});

  const data: Prisma.TeamUpdateArgs["data"] = restInput;
  const oldSlug = existingOrg.slug;
  const newSlug = restInput.slug;

  if (newSlug) {
    await throwIfSlugConflicts({ id, slug: newSlug });
    const isSlugChanged = !!oldSlug && newSlug !== oldSlug;
    if (isSlugChanged) {
      // If slug is changed, we need to rename the domain first
      // If renaming fails, we don't want to update the new slug in DB
      await renameDomain(oldSlug, newSlug);
    }
    data.slug = newSlug;
    data.metadata = mergeMetadata({
      // If we save slug, we don't need the requestedSlug anymore
      requestedSlug: undefined,
    });
  }

  const organizationSettingsData =
    organizationSettings || existingOrg.organizationSettings
      ? {
          isOrganizationConfigured:
            organizationSettings?.isOrganizationConfigured ||
            existingOrg.organizationSettings?.isOrganizationConfigured,
          isOrganizationVerified:
            organizationSettings?.isOrganizationVerified ||
            existingOrg.organizationSettings?.isOrganizationVerified,
          isAdminReviewed: organizationSettings?.isAdminReviewed,
          orgAutoAcceptEmail:
            organizationSettings?.orgAutoAcceptEmail || existingOrg.organizationSettings?.orgAutoAcceptEmail,
          isAdminAPIEnabled: !!(
            organizationSettings?.isAdminAPIEnabled ?? existingOrg.organizationSettings?.isAdminAPIEnabled
          ),
        }
      : undefined;

  const updatedOrganization = await organizationRepository.adminUpdateForAdminPanel({
    id,
    data,
    organizationSettingsData,
    oldSlug,
    newSlug,
  });

  return updatedOrganization;
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
      message: "Organization or a Team with same slug already exists",
      statusCode: 400,
    });
  }
}
