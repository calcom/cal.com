import { prisma } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import logger from "../../logger";
import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { LookupTarget, ProfileRepository } from "./profile";

const log = logger.getSubLogger({ prefix: ["repository/membership"] });
type IMembership = {
  teamId: number;
  userId: number;
  accepted: boolean;
  role: MembershipRole;
};

const membershipSelect = Prisma.validator<Prisma.MembershipSelect>()({
  id: true,
  teamId: true,
  userId: true,
  accepted: true,
  role: true,
  disableImpersonation: true,
});

const teamParentSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
});

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
});

export class MembershipRepository {
  static async create(data: IMembership) {
    return await prisma.membership.create({
      data,
    });
  }

  static async createMany(data: IMembership[]) {
    return await prisma.membership.createMany({
      data,
    });
  }

  /**
   * TODO: Using a specific function for specific tasks so that we don't have to focus on TS magic at the moment. May be try to make it a a generic findAllByProfileId with various options.
   */
  static async findAllByUpIdIncludeTeamWithMembersAndEventTypes(
    { upId }: { upId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    let prismaWhere;
    if (lookupTarget.type === LookupTarget.Profile) {
      /**
       * TODO: When we add profileId to membership, we lookup by profileId
       * If the profile is movedFromUser, we lookup all memberships without profileId as well.
       */
      const profile = await ProfileRepository.findById(lookupTarget.id);
      if (!profile) {
        return [];
      }
      prismaWhere = {
        userId: profile.user.id,
        ...where,
      };
    } else {
      prismaWhere = {
        userId: lookupTarget.id,
        ...where,
      };
    }

    log.debug(
      "findAllByUpIdIncludeTeamWithMembersAndEventTypes",
      safeStringify({
        prismaWhere,
      })
    );

    return await prisma.membership.findMany({
      where: prismaWhere,
      include: {
        team: {
          include: {
            members: {
              select: membershipSelect,
            },
            parent: {
              select: teamParentSelect,
            },
            eventTypes: {
              select: {
                ...eventTypeSelect,
                hashedLink: true,
                users: { select: userSelect },
                children: {
                  include: {
                    users: { select: userSelect },
                  },
                },
                hosts: {
                  include: {
                    user: { select: userSelect },
                  },
                },
              },
              // As required by getByViewHandler - Make it configurable
              orderBy: [
                {
                  position: "desc",
                },
                {
                  id: "asc",
                },
              ],
            },
          },
        },
      },
    });
  }
}
