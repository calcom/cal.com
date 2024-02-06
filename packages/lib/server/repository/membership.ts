import { prisma } from "@calcom/prisma";
import type { Prisma, MembershipRole } from "@calcom/prisma/client";

import logger from "../../logger";
import { safeStringify } from "../../safeStringify";
import { LookupTarget, ProfileRepository } from "./profile";

const log = logger.getSubLogger({ prefix: ["repository/membership"] });
type IMembership = {
  teamId: number;
  userId: number;
  profileId: number | null;
  accepted: boolean;
  role: MembershipRole;
};

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
            members: true,
            parent: true,
            eventTypes: {
              include: {
                team: {
                  include: {
                    eventTypes: true,
                  },
                },
                hashedLink: true,
                users: true,
                hosts: {
                  include: {
                    user: true,
                  },
                },
                children: {
                  include: {
                    users: true,
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
