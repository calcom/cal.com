import type { Prisma } from "@prisma/client";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole, RedirectType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import inviteMemberHandler from "../teams/inviteMember/inviteMember.handler";
import type { TCreateTeamsSchema } from "./createTeams.schema";

const log = logger.getSubLogger({ prefix: ["viewer/organizations/createTeams.handler"] });
type CreateTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  // Whether self-serve or not, createTeams endpoint is accessed by Org Owner only.
  // Even when instance admin creates an org, then by the time he reaches team creation steps, he has impersonated the org owner.
  const organizationOwner = ctx.user;

  if (!organizationOwner) {
    throw new NoUserError();
  }

  const { orgId, moveTeams } = input;

  // Remove empty team names that could be there due to the default empty team name
  const teamNames = input.teamNames.filter((name) => name.trim().length > 0);

  if (orgId !== organizationOwner.organizationId) {
    throw new NotAuthorizedError();
  }

  // Validate user membership role
  const userMembershipRole = await prisma.membership.findFirst({
    where: {
      userId: organizationOwner.id,
      teamId: orgId,
      role: {
        in: ["OWNER", "ADMIN"],
      },
      // @TODO: not sure if this already setup earlier
      // accepted: true,
    },
    select: {
      role: true,
    },
  });

  if (!userMembershipRole) {
    throw new NotAuthorizedError();
  }

  const organization = await prisma.team.findFirst({
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
    await UserRepository.findManyByOrganization({ organizationId: orgId }),
  ];

  const existingSlugs = teamSlugs
    .flatMap((ts) => ts.slug ?? [])
    .concat(userSlugs.flatMap((us) => us.username ?? []));

  const duplicatedSlugs = existingSlugs.filter((slug) =>
    teamNames.map((item) => slugify(item)).includes(slug)
  );

  await Promise.all(
    moveTeams
      .filter((team) => team.shouldMove)
      .map(async ({ id: teamId, newSlug }) => {
        await moveTeam({
          teamId,
          newSlug,
          org: {
            ...organization,
            ownerId: organizationOwner.id,
          },
          ctx,
        });
      })
  );

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

class NoUserError extends TRPCError {
  constructor() {
    super({ code: "BAD_REQUEST", message: "no_user" });
  }
}

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
  ctx,
}: {
  teamId: number;
  newSlug?: string | null;
  org: {
    id: number;
    slug: string | null;
    ownerId: number;
    metadata: Prisma.JsonValue;
  };
  ctx: CreateTeamsOptions["ctx"];
}) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      slug: true,
      metadata: true,
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Team with id: ${teamId} not found`,
    });
  }

  log.debug("Moving team", safeStringify({ teamId, newSlug, org, oldSlug: team.slug }));

  newSlug = newSlug ?? team.slug;
  const orgMetadata = teamMetadataSchema.parse(org.metadata);
  await prisma.team.update({
    where: {
      id: teamId,
    },
    data: {
      slug: newSlug,
      parentId: org.id,
    },
  });

  // Owner is already a member of the team. Inviting an existing member can throw error
  const invitableMembers = team.members.filter(isMembershipNotWithOwner).map((membership) => ({
    email: membership.user.email,
    role: membership.role,
  }));

  if (invitableMembers.length) {
    // Invite team members to the new org. They are already members of the team.
    await inviteMemberHandler({
      ctx,
      input: {
        teamId: org.id,
        language: "en",
        usernameOrEmail: invitableMembers,
      },
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
  const parsedMetadata = teamMetadataSchema.safeParse(metadata);
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No oldSlug for team. Not adding the redirect",
    });
  }
  if (!teamSlug) {
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
