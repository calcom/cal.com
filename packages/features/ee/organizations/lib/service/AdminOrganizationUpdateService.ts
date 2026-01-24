import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import type { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { renameDomain } from "@calcom/lib/domainManager/organization";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import { HttpError } from "@calcom/lib/http-error";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import type { TAdminUpdate } from "@calcom/trpc/server/routers/viewer/organizations/adminUpdate.schema";

type AdminOrganizationUpdateServiceDeps = {
  prismaClient: PrismaClient;
  organizationRepository: OrganizationRepository;
};

export class AdminOrganizationUpdateService {
  constructor(private readonly deps: AdminOrganizationUpdateServiceDeps) {}

  async updateOrganization(input: TAdminUpdate) {
    const { id, organizationSettings, ...restInput } = input;
    const { organizationRepository } = this.deps;

    const existingOrg = await organizationRepository.findByIdIncludeOrganizationSettings({ id });

    if (!existingOrg) {
      throw new HttpError({
        message: "Organization not found",
        statusCode: 404,
      });
    }

    const { mergeMetadata } = getMetadataHelpers(
      teamMetadataStrictSchema.unwrap(),
      existingOrg.metadata || {}
    );

    const data: Prisma.TeamUpdateArgs["data"] = restInput;
    const oldSlug = existingOrg.slug;
    const newSlug = restInput.slug;

    if (newSlug) {
      await throwIfSlugConflicts({
        id,
        slug: newSlug,
        teamRepository: new TeamRepository(this.deps.prismaClient),
      });
      const isSlugChanged = newSlug !== oldSlug;
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

    const updatedOrganization = await this.deps.prismaClient.$transaction(async (tx) => {
      const updatedOrganization = await tx.team.update({
        where: { id },
        data,
      });

      // Update all TempOrgRedirect records that point to the old org URL to use the new org URL
      if (newSlug && oldSlug && newSlug !== oldSlug) {
        const oldOrgUrlPrefix = getOrgFullOrigin(oldSlug);
        const newOrgUrlPrefix = getOrgFullOrigin(newSlug);

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
              organizationSettings?.orgAutoAcceptEmail ||
              existingOrg.organizationSettings?.orgAutoAcceptEmail,
            isAdminAPIEnabled: !!(
              organizationSettings?.isAdminAPIEnabled ?? existingOrg.organizationSettings?.isAdminAPIEnabled
            ),
          },
        });
      }
      return updatedOrganization;
    });

    return updatedOrganization;
  }
}

async function throwIfSlugConflicts({
  id,
  slug,
  teamRepository,
}: {
  id: number;
  slug: string;
  teamRepository: TeamRepository;
}) {
  const isSlugAvailable = await teamRepository.isSlugAvailableForUpdate({
    slug,
    teamId: id,
    parentId: null,
  });

  if (!isSlugAvailable) {
    throw new HttpError({
      message: "Organization or a Team with same slug already exists",
      statusCode: 400,
    });
  }
}
