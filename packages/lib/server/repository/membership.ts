import { prisma } from "@calcom/prisma";

import logger from "../../logger";
import { LookupTarget, ProfileRepository } from "./profile";
import type { Prisma } from ".prisma/client";

const log = logger.getSubLogger({ prefix: ["repository/membership"] });
export class MembershipRepository {
  static async findAllByProfileId({ id }: { id: number }) {
    return await prisma.membership.findMany({
      where: {
        profileId: id,
      },
    });
  }

  /**
   * TODO: Using a specific function for specific tasks so that we don't have to focus on TS magic at the moment. May be try to make it a a generic findAllByProfileId with various options.
   */
  static async findAllByProfileIdIncludeTeamWithMembersAndEventTypes(
    { upId }: { upId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    const prismaWhere = {
      ...(lookupTarget.type === LookupTarget.User
        ? {
            userId: lookupTarget.id,
          }
        : {
            profileId: lookupTarget.id,
          }),
      ...where,
    };

    log.debug("findAllByProfileIdIncludeTeamWithMembersAndEventTypes", {
      prismaWhere,
    });

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
