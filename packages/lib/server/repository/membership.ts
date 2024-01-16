import { prisma } from "@calcom/prisma";

import { LookupTarget, Profile } from "./profile";
import type { Prisma } from ".prisma/client";

export class MembershipRepository {
  static async findAllByProfileId({ profileLegacyId }: { profileLegacyId: string }) {
    const lookupTarget = Profile.getLookupTarget(profileLegacyId);
    if (lookupTarget.type === LookupTarget.User)
      return await prisma.membership.findMany({
        where: {
          userId: lookupTarget.id,
        },
      });

    if (lookupTarget.type === LookupTarget.Profile)
      return await prisma.membership.findMany({
        where: {
          profileId: lookupTarget.id,
        },
      });
  }

  static async findAllByProfileIdIncludeTeam(
    { profileLegacyId }: { profileLegacyId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const lookupTarget = Profile.getLookupTarget(profileLegacyId);
    if (lookupTarget.type === LookupTarget.User)
      return await prisma.membership.findMany({
        where: {
          userId: lookupTarget.id,
          ...where,
        },
        include: {
          team: true,
        },
      });

    if (lookupTarget.type === LookupTarget.Profile)
      return await prisma.membership.findMany({
        where: {
          profileId: lookupTarget.id,
          ...where,
        },
        include: {
          team: true,
        },
      });

    throw new Error("Invalid lookup target");
  }
}
