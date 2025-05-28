import { Prisma } from "@prisma/client";
import crypto from "crypto";
import type { z } from "zod";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import { TeamBilling } from "@calcom/features/ee/billing/teams";
import removeMember from "@calcom/features/ee/teams/lib/removeMember";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { uploadLogo } from "@calcom/lib/server/avatar";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { WorkflowService } from "../service/workflows";
import { getParsedTeam } from "./teamUtils";

type TeamGetPayloadWithParsedMetadata<TeamSelect extends Prisma.TeamSelect> =
  | (Omit<Prisma.TeamGetPayload<{ select: TeamSelect }>, "metadata" | "isOrganization"> & {
      metadata: z.infer<typeof teamMetadataSchema>;
      isOrganization: boolean;
    })
  | null;

type GetTeamOrOrgArg<TeamSelect extends Prisma.TeamSelect> = {
  lookupBy: (
    | {
        id: number;
      }
    | {
        slug: string;
      }
  ) & {
    havingMemberWithId?: number;
  };
  /**
   * If we are fetching a team, this is the slug of the organization that the team belongs to.
   */
  forOrgWithSlug: string | null;
  /**
   * If true, means that we need to fetch an organization with the given slug. Otherwise, we need to fetch a team with the given slug.
   */
  isOrg: boolean;
  teamSelect: TeamSelect;
};

const log = logger.getSubLogger({ prefix: ["repository", "team"] });

/**
 * Gets the team or organization with the given slug or id reliably along with parsed metadata.
 */
async function getTeamOrOrg<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  isOrg,
  teamSelect,
}: GetTeamOrOrgArg<TeamSelect>): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  const where: Prisma.TeamFindFirstArgs["where"] = {};
  teamSelect = {
    ...teamSelect,
    metadata: true,
    isOrganization: true,
  } satisfies TeamSelect;
  if (lookupBy.havingMemberWithId) where.members = { some: { userId: lookupBy.havingMemberWithId } };

  if ("id" in lookupBy) {
    where.id = lookupBy.id;
  } else {
    where.slug = lookupBy.slug;
  }

  if (isOrg) {
    // We must fetch only the organization here.
    // Note that an organization and a team that doesn't belong to an organization, both have parentId null
    // If the organization has null slug(but requestedSlug is 'test') and the team also has slug 'test', we can't distinguish them without explicitly checking the metadata.isOrganization
    // Note that, this isn't possible now to have same requestedSlug as the slug of a team not part of an organization. This is legacy teams handling mostly. But it is still safer to be sure that you are fetching an Organization only in case of isOrgView
    where.isOrganization = true;
    // We must fetch only the team here.
  } else {
    if (forOrgWithSlug) {
      where.parent = whereClauseForOrgWithSlugOrRequestedSlug(forOrgWithSlug);
    }
  }

  log.debug({
    orgSlug: forOrgWithSlug,
    teamLookupBy: lookupBy,
    isOrgView: isOrg,
    where,
  });

  const teams = await prisma.team.findMany({
    where,
    select: teamSelect,
  });

  const teamsWithParsedMetadata = teams
    .map((team) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore ts types are way too complciated for this now
      const parsedMetadata = teamMetadataSchema.parse(team.metadata ?? {});
      return {
        ...team,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore It does exist
        isOrganization: team.isOrganization as boolean,
        metadata: parsedMetadata,
      };
    })
    // In cases where there are many teams with the same slug, we need to find out the one and only one that matches our criteria
    .filter((team) => {
      // We need an org if isOrgView otherwise we need a team
      return isOrg ? team.isOrganization : !team.isOrganization;
    });

  if (teamsWithParsedMetadata.length > 1) {
    log.error("Found more than one team/Org. We should be doing something wrong.", {
      isOrgView: isOrg,
      where,
      teams: teamsWithParsedMetadata.map((team) => {
        const t = team as unknown as { id: number; slug: string };
        return {
          id: t.id,
          slug: t.slug,
        };
      }),
    });
  }

  const team = teamsWithParsedMetadata[0];
  if (!team) return null;
  // HACK: I am not sure how to make Prisma in peace with TypeScript with this repository pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return team as any;
}

export async function getTeam<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  teamSelect,
}: Omit<GetTeamOrOrgArg<TeamSelect>, "isOrg">): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  return getTeamOrOrg({
    lookupBy,
    forOrgWithSlug: forOrgWithSlug,
    isOrg: false,
    teamSelect,
  });
}

export async function getOrg<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  teamSelect,
}: Omit<GetTeamOrOrgArg<TeamSelect>, "isOrg">): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  return getTeamOrOrg({
    lookupBy,
    forOrgWithSlug: forOrgWithSlug,
    isOrg: true,
    teamSelect,
  });
}

const teamSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
  isOrganization: true,
  organizationSettings: true,
  isPlatform: true,
});

export class TeamRepository {
  static async findById({ id }: { id: number }) {
    const team = await prisma.team.findUnique({
      where: {
        id,
      },
      select: teamSelect,
    });
    if (!team) {
      return null;
    }
    return getParsedTeam(team);
  }

  static async deleteById({ id }: { id: number }) {
    try {
      await WorkflowService.deleteWorkflowRemindersOfRemovedTeam(id);
    } catch (e) {
      console.error(e);
    }

    const deletedTeam = await prisma.$transaction(async (tx) => {
      await tx.eventType.deleteMany({
        where: {
          teamId: id,
          schedulingType: "MANAGED",
        },
      });

      // delete all memberships
      await tx.membership.deleteMany({
        where: {
          teamId: id,
        },
      });

      const deletedTeam = await tx.team.delete({
        where: {
          id: id,
        },
      });

      const teamBilling = await TeamBilling.findAndInit(id);
      await teamBilling.cancel();
      return deletedTeam;
    });

    if (deletedTeam?.isOrganization && deletedTeam.slug) deleteDomain(deletedTeam.slug);

    return deletedTeam;
  }

  static async create({
    name,
    slug,
    userId,
    logo,
    parentId,
  }: {
    name: string;
    slug: string;
    userId: number;
    logo?: string;
    parentId?: number;
  }) {
    const createdTeam = await prisma.team.create({
      data: {
        slug,
        name,
        members: {
          create: {
            userId,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
        ...(parentId && { parentId }),
      },
    });

    if (logo && logo.startsWith("data:image/png;base64,")) {
      const logoUrl = await uploadLogo({
        logo,
        teamId: createdTeam.id,
      });
      await prisma.team.update({
        where: {
          id: createdTeam.id,
        },
        data: {
          logoUrl,
        },
      });
    }

    return createdTeam;
  }

  static async update({
    id,
    data,
    logo,
    prevTeam,
    isTeamBillingEnabled,
  }: {
    id: number;
    data: Prisma.TeamUpdateArgs["data"];
    logo?: string | null;
    prevTeam?: any;
    isTeamBillingEnabled?: boolean;
  }) {
    const updateData: Prisma.TeamUpdateArgs["data"] = { ...data };

    if (logo && logo.startsWith("data:image/png;base64,")) {
      const { uploadLogo } = await import("@calcom/lib/server/avatar");
      updateData.logoUrl = await uploadLogo({ teamId: id, logo });
    } else if (typeof logo !== "undefined" && !logo) {
      updateData.logoUrl = null;
    }

    if (prevTeam && isTeamBillingEnabled) {
      if (
        data.slug &&
        isTeamBillingEnabled &&
        /** If the team doesn't have a slug we can assume that it hasn't been published yet. */
        !prevTeam.slug
      ) {
        updateData.metadata = {
          requestedSlug: data.slug,
        };
        delete updateData.slug;
      } else if (data.slug) {
        const { teamMetadataSchema } = await import("@calcom/prisma/zod-utils");
        const metadataParse = teamMetadataSchema.safeParse(prevTeam.metadata);
        if (metadataParse.success) {
          const { requestedSlug: _, ...cleanMetadata } = metadataParse.data || {};
          updateData.metadata = {
            ...cleanMetadata,
          };
        }
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    if (prevTeam && updatedTeam.parentId && prevTeam.slug) {
      if (updatedTeam.slug === prevTeam.slug) return updatedTeam;

      const parentTeam = await prisma.team.findUnique({
        where: {
          id: updatedTeam.parentId,
        },
        select: {
          slug: true,
        },
      });

      if (!parentTeam?.slug) {
        throw new Error(`Parent team with slug: ${parentTeam?.slug} not found`);
      }

      const { getOrgFullOrigin } = await import("@calcom/ee/organizations/lib/orgDomains");
      const orgUrlPrefix = getOrgFullOrigin(parentTeam.slug);

      const toUrlOld = `${orgUrlPrefix}/${prevTeam.slug}`;
      const toUrlNew = `${orgUrlPrefix}/${updatedTeam.slug}`;

      const { RedirectType } = await import("@calcom/prisma/enums");
      await prisma.tempOrgRedirect.updateMany({
        where: {
          type: RedirectType.Team,
          toUrl: toUrlOld,
        },
        data: {
          toUrl: toUrlNew,
        },
      });
    }

    return updatedTeam;
  }

  static async findBySlug(slug: string, options?: { includeMemberships?: boolean }) {
    return await prisma.team.findFirst({
      where: {
        slug,
      },
      ...(options?.includeMemberships && {
        include: {
          members: true,
        },
      }),
    });
  }

  static async checkSlugConflict({ slug, exceptTeamId }: { slug: string; exceptTeamId: number }) {
    const teams = await prisma.team.findMany({
      where: {
        slug: slug,
      },
    });

    return teams.some((t) => t.id !== exceptTeamId);
  }

  static async checkSlugCollision({ slug, parentId }: { slug: string; parentId: number | null }) {
    return await prisma.team.findFirst({
      where: {
        slug: slug,
        parentId: parentId,
      },
    });
  }

  static async findByParentId(parentId: number) {
    return await prisma.team.findMany({
      where: {
        parentId,
      },
    });
  }

  static async acceptMembership({ userId, teamId }: { userId: number; teamId: number }) {
    const teamMembership = await prisma.membership.update({
      where: {
        userId_teamId: { userId, teamId },
      },
      data: {
        accepted: true,
      },
      include: {
        team: true,
      },
    });

    return teamMembership;
  }

  static async declineMembership({ userId, teamId }: { userId: number; teamId: number }) {
    const membership = await prisma.membership.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
      include: {
        team: true,
      },
    });

    return membership;
  }

  static async updateMembership({
    userId,
    teamId,
    data,
  }: {
    userId: number;
    teamId: number;
    data: Prisma.MembershipUpdateInput;
  }) {
    return await prisma.membership.update({
      where: {
        userId_teamId: { userId, teamId },
      },
      data,
    });
  }

  static async changeMemberRole({
    memberId,
    teamId,
    role,
  }: {
    memberId: number;
    teamId: number;
    role: MembershipRole;
  }) {
    return await prisma.membership.update({
      where: {
        userId_teamId: { userId: memberId, teamId },
      },
      data: {
        role,
      },
      include: {
        team: true,
        user: true,
      },
    });
  }

  static async listMembers({
    teamId,
    cursor,
    limit,
    searchTerm,
  }: {
    teamId: number;
    cursor?: string;
    limit?: number;
    searchTerm?: string;
  }) {
    const whereCondition: Prisma.MembershipWhereInput = {
      teamId,
    };

    if (searchTerm) {
      whereCondition.user = {
        OR: [
          { email: { contains: searchTerm, mode: "insensitive" } },
          { username: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
        ],
      };
    }

    const totalMembers = await prisma.membership.count({ where: whereCondition });

    const userSelect = Prisma.validator<Prisma.UserSelect>()({
      username: true,
      email: true,
      name: true,
      avatarUrl: true,
      id: true,
      bio: true,
      disableImpersonation: true,
      lastActiveAt: true,
    });

    const teamMembers = await prisma.membership.findMany({
      where: whereCondition,
      select: {
        id: true,
        role: true,
        accepted: true,
        teamId: true,
        user: { select: userSelect },
      },
      cursor: cursor ? { id: parseInt(cursor, 10) } : undefined,
      take: limit ? limit + 1 : undefined,
      orderBy: { id: "asc" },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (limit && teamMembers.length > limit) {
      const nextItem = teamMembers.pop();
      nextCursor = nextItem?.id ? String(nextItem.id) : undefined;
    }

    return {
      members: teamMembers,
      nextCursor,
      meta: {
        totalRowCount: totalMembers,
      },
    };
  }

  static async createInvite({ teamId, token }: { teamId: number; token?: string }) {
    if (token) {
      const existingToken = await prisma.verificationToken.findFirst({
        where: { token, identifier: `invite-link-for-teamId-${teamId}`, teamId },
      });
      if (!existingToken) return null;
      return existingToken;
    }

    const newToken = await prisma.verificationToken.create({
      data: {
        identifier: `invite-link-for-teamId-${teamId}`,
        token: token || crypto.randomBytes(32).toString("hex"),
        expires: new Date(new Date().setHours(168)), // +1 week,
        expiresInDays: 7,
        teamId,
      },
    });

    return newToken;
  }

  static async deleteInvite({ teamId, token }: { teamId: number; token: string }) {
    return await prisma.verificationToken.delete({
      where: {
        token,
      },
    });
  }

  static async getVerificationToken({ token }: { token: string }) {
    return await prisma.verificationToken.findFirst({
      where: {
        token: token,
      },
      select: {
        teamId: true,
        id: true,
      },
    });
  }

  static async getVerificationTokenByEmail({ identifier, teamId }: { identifier: string; teamId: number }) {
    return await prisma.verificationToken.findFirst({
      where: {
        identifier,
        teamId,
      },
      select: {
        token: true,
      },
    });
  }

  static async setInviteExpiration({
    token,
    expiresInDays,
  }: {
    token: string;
    expiresInDays: number | null;
  }) {
    const oneDay = 24 * 60 * 60 * 1000;
    const expires = expiresInDays
      ? new Date(Date.now() + expiresInDays * oneDay)
      : new Date("9999-12-31T23:59:59Z"); //maximum possible date incase the link is set to never expire

    return await prisma.verificationToken.update({
      where: { token },
      data: {
        expires,
        expiresInDays: expiresInDays ? expiresInDays : null,
      },
    });
  }

  static async listInvites({ teamId }: { teamId: number }) {
    return await prisma.verificationToken.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        token: true,
        expires: true,
        expiresInDays: true,
        createdAt: true,
      },
    });
  }

  static async listUserInvites(userId: number) {
    return await prisma.membership.findMany({
      where: {
        user: {
          id: userId,
        },
        accepted: false,
      },
    });
  }

  static async listOwnedTeams({ userId, roles }: { userId: number; roles: MembershipRole[] }) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        teams: {
          where: {
            accepted: true,
            role: {
              in: roles,
            },
          },
          select: {
            team: true,
          },
        },
      },
    });

    return user?.teams
      ?.filter((m) => {
        return !m.team.isOrganization;
      })
      ?.map(({ team }) => team);
  }

  static async getMembershipByUser({ userId, teamId }: { userId: number; teamId: number }) {
    return await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  static async listUserTeams({ userId }: { userId: number }) {
    return await prisma.membership.findMany({
      where: {
        userId: userId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isOrganization: true,
            metadata: true,
            inviteTokens: true,
            parent: true,
            parentId: true,
          },
        },
      },
      orderBy: { role: "desc" },
    });
  }

  // TODO: Move errors away from TRPC error to make it more generic
  static async inviteMemberByToken(token: string, userId: number) {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        OR: [{ expiresInDays: null }, { expires: { gte: new Date() } }],
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
    if (!verificationToken.teamId || !verificationToken.team)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite token is not associated with any team",
      });

    try {
      await prisma.membership.create({
        data: {
          createdAt: new Date(),
          teamId: verificationToken.teamId,
          userId: userId,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This user is a member of this team / has a pending invitation.",
          });
        }
      } else throw e;
    }

    const teamBilling = await TeamBilling.findAndInit(verificationToken.teamId);
    await teamBilling.updateQuantity();

    return verificationToken.team.name;
  }

  static async publish(teamId: number) {
    const teamBilling = await TeamBilling.findAndInit(teamId);
    return teamBilling.publish();
  }

  static async removeMembers(teamIds: number[], memberIds: number[], isOrg = false) {
    const deleteMembershipPromises = [];

    for (const memberId of memberIds) {
      for (const teamId of teamIds) {
        deleteMembershipPromises.push(
          // This removeMember function is from @calcom/features/ee/teams/lib/removeMember.ts we should probably move it to this repository.
          removeMember({
            teamId,
            memberId,
            isOrg,
          })
        );
      }
    }

    await Promise.all(deleteMembershipPromises);

    const teamsBilling = await TeamBilling.findAndInitMany(teamIds);
    const teamBillingPromises = teamsBilling.map((teamBilling) => teamBilling.updateQuantity());
    await Promise.allSettled(teamBillingPromises);
  }

  static async findTeamWithMembers(teamId: number) {
    return await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        members: {
          select: {
            accepted: true,
          },
        },
        id: true,
        metadata: true,
        parentId: true,
        isOrganization: true,
      },
    });
  }

  static async hasTeamPlan(userId: number) {
    const hasTeamPlan = await prisma.membership.findFirst({
      where: {
        accepted: true,
        userId,
        team: {
          slug: {
            not: null,
          },
        },
      },
    });
    return { hasTeamPlan: !!hasTeamPlan };
  }

  static async hasActiveTeamPlan(userId: number) {
    const { IS_SELF_HOSTED } = await import("@calcom/lib/constants");
    if (IS_SELF_HOSTED) return { isActive: true, isTrial: false };

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
    });

    if (!teams.length) return { isActive: false, isTrial: false };

    let isTrial = false;
    for (const team of teams) {
      const { InternalTeamBilling } = await import("@calcom/ee/billing/teams/internal-team-billing");
      const teamBillingService = new InternalTeamBilling(team);
      const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

      if (subscriptionStatus === "active" || subscriptionStatus === "past_due") {
        return { isActive: true, isTrial: false };
      }
      if (subscriptionStatus === "trialing") {
        isTrial = true;
      }
    }

    return { isActive: false, isTrial };
  }

  static async getUpgradeable(userId: number) {
    const { IS_TEAM_BILLING_ENABLED } = await import("@calcom/lib/constants");
    if (!IS_TEAM_BILLING_ENABLED) return [];

    let teams = await prisma.membership.findMany({
      where: {
        user: {
          id: userId,
        },
        role: MembershipRole.OWNER,
        team: {
          parentId: null, // Since ORGS relay on their parent's subscription, we don't need to return them
        },
      },
      include: {
        team: {
          include: {
            children: true,
          },
        },
      },
    });

    /** We only need to return teams that don't have a `subscriptionId` on their metadata */
    teams = teams.filter((m) => {
      const metadata = teamMetadataSchema.safeParse(m.team.metadata);
      if (metadata.success && metadata.data?.subscriptionId) return false;
      if (m.team.isOrganization) return false; // We also don't return ORGs as it will be handled in OrgUpgradeBanner
      if (m.team.children.length > 0) return false; // We also don't return ORGs as it will be handled in OrgUpgradeBanner
      return true;
    });
    return teams;
  }

  static async listSimpleMembers(userId: number, isOrgAdmin: boolean, isOrgPrivate: boolean) {
    if (!isOrgAdmin && isOrgPrivate) {
      return [];
    }

    const teamsToQuery = (
      await prisma.membership.findMany({
        where: {
          userId,
          accepted: true,
          NOT: [
            {
              role: MembershipRole.MEMBER,
              team: {
                isPrivate: true,
              },
            },
          ],
        },
        select: { teamId: true },
      })
    ).map((membership) => membership.teamId);

    if (!teamsToQuery.length) {
      return [];
    }

    // Fetch unique users through memberships
    const members = (
      await prisma.membership.findMany({
        where: {
          accepted: true,
          teamId: { in: teamsToQuery },
        },
        select: {
          id: true,
          accepted: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        distinct: ["userId"],
        orderBy: [
          { userId: "asc" }, // First order by userId to ensure consistent ordering
          { id: "asc" }, // Then by id as secondary sort
        ],
      })
    ).map((membership) => membership.user);

    return members;
  }

  static async checkIfMembershipExists({ teamId, value }: { teamId: number; value: string }) {
    const membership = await prisma.membership.findFirst({
      where: {
        teamId,
        user: {
          OR: [
            {
              email: value,
            },
            {
              username: value,
            },
          ],
        },
      },
    });

    return !!membership;
  }

  static async getInternalNotesPresets({ teamId }: { teamId: number }) {
    return await prisma.internalNotePreset.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        name: true,
        cancellationReason: true,
      },
    });
  }

  static async skipTeamTrials({ userId }: { userId: number }) {
    try {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          trialEndsAt: null,
        },
      });

      const ownedTeams = await prisma.team.findMany({
        where: {
          members: {
            some: {
              userId: userId,
              accepted: true,
              role: "OWNER",
            },
          },
        },
      });

      return { success: true, ownedTeams };
    } catch (error) {
      return { success: false, error: "Failed to skip team trials" };
    }
  }

  static async updateInternalNotesPresets({
    teamId,
    presets,
  }: {
    teamId: number;
    presets: { id?: number; name: string; cancellationReason?: string }[];
  }) {
    const existingPresets = await prisma.internalNotePreset.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
      },
    });

    const existingIds = existingPresets.map((preset) => preset.id);
    const updatedIds = presets.map((preset) => preset.id).filter((id): id is number => id !== undefined);

    const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));

    if (idsToDelete.length > 0) {
      await prisma.internalNotePreset.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
          teamId,
        },
      });
    }

    return await Promise.all(
      presets.map((preset) => {
        if (preset.id && preset.id !== -1) {
          return prisma.internalNotePreset.update({
            where: {
              id: preset.id,
              teamId,
            },
            data: {
              name: preset.name,
              cancellationReason: preset.cancellationReason,
            },
          });
        } else {
          return prisma.internalNotePreset.create({
            data: {
              name: preset.name,
              cancellationReason: preset.cancellationReason,
              teamId,
            },
          });
        }
      })
    );
  }
}
