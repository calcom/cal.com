import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole, RedirectType } from "@calcom/prisma/enums";
import { teamMetadataSchema, teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { inviteMembersWithNoInviterPermissionCheck } from "../teams/inviteMember/inviteMember.handler";
import type { TCreateTeamsSchema } from "./createTeams.schema";

const log = logger.getSubLogger({ prefix: ["viewer/organizations/createTeams.handler"] });
type CreateTeamsOptions = {
  ctx: {
    user: {
      id: number;
      organizationId: number | null;
    };
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  // Whether self-serve or not, createTeams endpoint is accessed by Org Owner only.
  // Even when instance admin creates an org, then by the time he reaches team creation steps, he has impersonated the org owner.
  const organizationOwner = ctx.user;

  const { orgId, moveTeams, creationSource } = input;

  // Remove empty team names that could be there due to the default empty team name
  const teamNames = input.teamNames.filter((name) => name.trim().length > 0);

  if (orgId !== organizationOwner.organizationId) {
    log.error("User is not the owner of the organization", safeStringify({ orgId, organizationOwner }));
    throw new NotAuthorizedError();
  }

  // Validate user has permission to create teams in the organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: organizationOwner.id,
    teamId: orgId,
    permission: "team.create",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    log.error(
      "User is not authorized to create teams in the organization",
      safeStringify({ orgId, organizationOwner })
    );
    throw new NotAuthorizedError();
  }

  const organization = await prisma.team.findUnique({
    where: { id: orgId },
    select: { slug: true, id: true, metadata: true },
  });

  if (!organization) throw new NoOrganizationError();

  const parseTeams = teamMetadataSchema.safeParse(organization?.metadata);

  if (!parseTeams.success) {
    throw new InvalidMetadataError();
  }

  const metadata = parseTeams.success ? parseTeams.data : undefined;

  if (!metadata?.requestedSlug && !organization?.slug) {
    throw new NoOrganizationSlugError();
  }

  const [teamSlugs, userSlugs] = [
    await prisma.team.findMany({ where: { parentId: orgId }, select: { slug: true } }),
    await new UserRepository(prisma).findManyByOrganization({ organizationId: orgId }),
  ];

  const existingSlugs = teamSlugs
    .flatMap((ts) => ts.slug ?? [])
    .concat(userSlugs.flatMap((us) => us.username ?? []));

  const duplicatedSlugs = existingSlugs.filter((slug) =>
    teamNames.map((item) => slugify(item)).includes(slug)
  );

  // Process team migrations sequentially to avoid race conditions - Moving a team invites members to the organization again and there are known unique constraints failure in membership and profile creation if done in parallel and a user happens to be part of more than one team
  for (const team of moveTeams.filter((team) => team.shouldMove)) {
    await moveTeam({
      teamId: team.id,
      newSlug: team.newSlug,
      org: {
        ...organization,
        ownerId: organizationOwner.id,
      },
      creationSource,
    });
  }

  if (duplicatedSlugs.length === teamNames.length) {
    return { duplicatedSlugs };
  }

  await prisma.$transaction(
    teamNames.flatMap((name) => {
      if (!duplicatedSlugs.includes(slugify(name))) {
        return prisma.team.create({
          data: {
            name,
            parentId: orgId,
            slug: slugify(name),
            members: {
              create: { userId: ctx.user.id, role: MembershipRole.OWNER, accepted: true },
            },
          },
        });
      } else {
        return [];
      }
    })
  );

  return { duplicatedSlugs };
};

class NotAuthorizedError extends TRPCError {
  constructor() {
    super({ code: "FORBIDDEN", message: "not_authorized" });
  }
}

class InvalidMetadataError extends TRPCError {
  constructor() {
    super({ code: "BAD_REQUEST", message: "invalid_organization_metadata" });
  }
}

class NoOrganizationError extends TRPCError {
  constructor() {
    super({ code: "BAD_REQUEST", message: "no_organization_found" });
  }
}

class NoOrganizationSlugError extends TRPCError {
  constructor() {
    super({ code: "BAD_REQUEST", message: "no_organization_slug" });
  }
}

export default createTeamsHandler;

async function moveTeam({
  teamId,
  newSlug,
  org,
  creationSource,
}: {
  teamId: number;
  newSlug?: string | null;
  org: {
    id: number;
    slug: string | null;
    ownerId: number;
    metadata: Prisma.JsonValue;
  };
  creationSource: CreationSource;
}) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      slug: true,
      metadata: true,
      parent: {
        select: {
          id: true,
          isPlatform: true,
        },
      },
      members: {
        select: {
          role: true,
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    log.warn(`Team with id: ${teamId} not found. Skipping migration.`, {
      teamId,
      orgId: org.id,
      orgSlug: org.slug,
    });
    return;
  }

  if (team.parent?.isPlatform) {
    log.info(
      "Team belongs to a platform organization. Not moving to regular organization.",
      safeStringify({ teamId, newSlug, org, oldSlug: team.slug, platformOrgId: team.parent.id })
    );
    return;
  }
  log.info("Moving team", safeStringify({ teamId, newSlug, oldSlug: team.slug }));

  newSlug = newSlug ?? team.slug;
  const orgMetadata = teamMetadataSchema.parse(org.metadata);
  try {
    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        slug: newSlug,
        parentId: org.id,
      },
    });

    const creditService = new CreditService();
    await creditService.moveCreditsFromTeamToOrg({ teamId, orgId: org.id });
  } catch (error) {
    log.error(
      "Error while moving team to organization",
      safeStringify(error),
      safeStringify({
        teamId,
        newSlug,
        orgId: org.id,
      })
    );
    throw error;
  }

  // Owner is already a member of the team. Inviting an existing member can throw error
  const invitableMembers = team.members.filter(isMembershipNotWithOwner).map((membership) => ({
    usernameOrEmail: membership.user.email,
    role: membership.role,
  }));

  if (invitableMembers.length) {
    // Invite team members to the new org. They are already members of the team.
    await inviteMembersWithNoInviterPermissionCheck({
      orgSlug: org.slug,
      invitations: invitableMembers,
      creationSource,
      language: "en",
      inviterName: null,
      teamId: org.id,
      // This is important so that if we re-invite existing users accidentally, we don't endup erroring out.
      // Because this is a bulk action that could be taken from organization payment webhook, we could have cases where a user was just invited through another team migration in parallel.
      isDirectUserAction: false,
    });
  }

  await addTeamRedirect({
    oldTeamSlug: team.slug,
    teamSlug: newSlug,
    orgSlug: org.slug || (orgMetadata?.requestedSlug ?? null),
  });

  function isMembershipNotWithOwner(membership: { userId: number }) {
    // Org owner is already a member of the team
    return membership.userId !== org.ownerId;
  }
  // Cancel existing stripe subscriptions once the team is migrated
  const subscriptionId = getSubscriptionId(team.metadata);
  if (subscriptionId) {
    await tryToCancelSubscription(subscriptionId);
  }
}

async function tryToCancelSubscription(subscriptionId: string) {
  try {
    log.debug("Canceling stripe subscription", safeStringify({ subscriptionId }));
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    log.error("Error while cancelling stripe subscription", error);
  }
}

function getSubscriptionId(metadata: Prisma.JsonValue) {
  const parsedMetadata = teamMetadataStrictSchema.safeParse(metadata);
  if (parsedMetadata.success) {
    const subscriptionId = parsedMetadata.data?.subscriptionId;
    if (!subscriptionId) {
      log.warn("No subscriptionId found in team metadata", safeStringify({ metadata, parsedMetadata }));
    }
    return subscriptionId;
  } else {
    log.warn(`There has been an error`, parsedMetadata.error);
  }
}

async function addTeamRedirect({
  oldTeamSlug,
  teamSlug,
  orgSlug,
}: {
  oldTeamSlug: string | null;
  teamSlug: string | null;
  orgSlug: string | null;
}) {
  logger.info(`Adding redirect for team: ${oldTeamSlug} -> ${teamSlug}`);
  if (!oldTeamSlug) {
    // This can happen for unpublished teams that don't have a slug yet
    logger.warn(`No oldSlug for team. Not adding the redirect`);
    return;
  }
  if (!teamSlug) {
    // This should not happen as org onboarding ensures teams have slugs
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No slug for team. Not adding the redirect",
    });
  }
  if (!orgSlug) {
    logger.warn(`No slug for org. Not adding the redirect`);
    return;
  }
  const orgUrlPrefix = getOrgFullOrigin(orgSlug);

  await prisma.tempOrgRedirect.upsert({
    where: {
      from_type_fromOrgId: {
        type: RedirectType.Team,
        from: oldTeamSlug,
        fromOrgId: 0,
      },
    },
    create: {
      type: RedirectType.Team,
      from: oldTeamSlug,
      fromOrgId: 0,
      toUrl: `${orgUrlPrefix}/${teamSlug}`,
    },
    update: {
      toUrl: `${orgUrlPrefix}/${teamSlug}`,
    },
  });
}
