import type { Prisma } from "@prisma/client";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
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
  // Get User From context
  const user = ctx.user;

  if (!user) {
    throw new NoUserError();
  }

  const { orgId, moveTeams } = input;

  // Remove empty team names that could be there due to the default empty team name
  const teamNames = input.teamNames.filter((name) => name.trim().length > 0);

  if (orgId !== user.organizationId) {
    throw new NotAuthorizedError();
  }

  // Validate user membership role
  const userMembershipRole = await prisma.membership.findFirst({
    where: {
      userId: user.id,
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
          org: organization,
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

  await Promise.all(
    // TODO: Support different role for different members in usernameOrEmail list and then remove this map
    team.members.map(async (membership) => {
      // Invite team members to the new org. They are already members of the team.
      await inviteMemberHandler({
        ctx,
        input: {
          teamId: org.id,
          language: "en",
          role: membership.role,
          usernameOrEmail: membership.user.email,
          isOrg: true,
        },
      });
    })
  );

  await addTeamRedirect({
    oldTeamSlug: team.slug,
    teamSlug: newSlug,
    orgSlug: org.slug || (orgMetadata?.requestedSlug ?? null),
  });
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
