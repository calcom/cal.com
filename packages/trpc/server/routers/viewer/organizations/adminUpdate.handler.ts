import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
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
  const existingOrg = await prisma.team.findUnique({
    where: {
      id: id,
    },
    include: {
      organizationSettings: true,
    },
  });

  if (!existingOrg) {
    throw new HttpError({
      message: "Organization not found",
      statusCode: 404,
    });
  }

  const { mergeMetadata } = getMetadataHelpers(teamMetadataStrictSchema.unwrap(), existingOrg.metadata || {});

  const data: Prisma.TeamUpdateArgs["data"] = restInput;

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
    });
  }

  const updatedOrganization = await prisma.$transaction(async (tx) => {
    const updatedOrganization = await tx.team.update({
      where: { id },
      data,
    });

    // Update all TempOrgRedirect records that point to the old org URL to use the new org URL
    if (restInput.slug && existingOrg.slug && restInput.slug !== existingOrg.slug) {
      const oldOrgUrlPrefix = getOrgFullOrigin(existingOrg.slug);
      const newOrgUrlPrefix = getOrgFullOrigin(restInput.slug);

      const redirectsToUpdate = await tx.tempOrgRedirect.findMany({
        where: {
          toUrl: {
            startsWith: oldOrgUrlPrefix,
          },
        },
        select: {
          id: true,
          toUrl: true,
        },
      });

      for (const redirect of redirectsToUpdate) {
        const newToUrl = redirect.toUrl.replace(oldOrgUrlPrefix, newOrgUrlPrefix);
        await tx.tempOrgRedirect.update({
          where: {
            id: redirect.id,
          },
          data: {
            toUrl: newToUrl,
          },
        });
      }
    }

    if (organizationSettings || existingOrg.organizationSettings) {
      await tx.organizationSettings.update({
        where: {
          organizationId: updatedOrganization.id,
        },
        data: {
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
        },
      });
    }
    return updatedOrganization;
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
