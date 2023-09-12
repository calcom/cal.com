import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateTeamsSchema } from "./createTeams.schema";

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

  const { teamNames, orgId } = input;

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
    select: { slug: true, metadata: true },
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

  const [teamSlugs, userSlugs] = await prisma.$transaction([
    prisma.team.findMany({ where: { parentId: orgId }, select: { slug: true } }),
    prisma.user.findMany({ where: { organizationId: orgId }, select: { username: true } }),
  ]);

  const existingSlugs = teamSlugs
    .flatMap((ts) => ts.slug ?? [])
    .concat(userSlugs.flatMap((us) => us.username ?? []));

  const duplicatedSlugs = existingSlugs.filter((slug) =>
    teamNames.map((item) => slugify(item)).includes(slug)
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
