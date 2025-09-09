import { availabilityUserSelect, prisma, type PrismaTransaction, type PrismaClient } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/client";
import type { Prisma, CalIdMembership } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import logger from "../../logger";
import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { LookupTarget, ProfileRepository } from "./profile";
import { withSelectedCalendars } from "./user";

const log = logger.getSubLogger({ prefix: ["repository/calIdMembership"] });
type ICalIdMembership = {
  calIdTeamId: number;
  userId: number;
  acceptedInvitation: boolean;
  role: CalIdMembershipRole;
  createdAt?: Date;
};

const calIdMembershipSelect = {
  id: true,
  calIdTeamId: true,
  userId: true,
  acceptedInvitation: true,
  role: true,
  impersonation: true,
} satisfies Prisma.CalIdMembershipSelect;

type CalIdMembershipSelectableKeys = keyof typeof calIdMembershipSelect;

type CalIdMembershipPartialSelect = Partial<Record<CalIdMembershipSelectableKeys, boolean>>;

type CalIdMembershipDTO = Pick<CalIdMembership, CalIdMembershipSelectableKeys>;

type CalIdMembershipDTOFromSelect<TSelect extends CalIdMembershipPartialSelect> = {
  [K in keyof TSelect & keyof CalIdMembershipDTO as TSelect[K] extends true ? K : never]: CalIdMembershipDTO[K];
};

const calIdTeamParentSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bio: true,
  hideTeamBranding: true,
  hideTeamProfileLink: true,
  isTeamPrivate: true,
  hideBookATeamMember: true,
  metadata: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  timeFormat: true,
  timeZone: true,
  weekStart: true,
  bookingFrequency: true,
} satisfies Prisma.CalIdTeamSelect;

const userSelect = {
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
  timeZone: true,
} satisfies Prisma.UserSelect;

const getWhereForfindAllByUpId = async (upId: string, where?: Prisma.CalIdMembershipWhereInput) => {
  const lookupTarget = ProfileRepository.getLookupTarget(upId);
  let prismaWhere;
  if (lookupTarget.type === LookupTarget.Profile) {
    /**
     * TODO: When we add profileId to calIdMembership, we lookup by profileId
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

  return prismaWhere;
};

export class CalIdMembershipRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async hasMembership({ userId, calIdTeamId }: { userId: number; calIdTeamId: number }): Promise<boolean> {
    const membership = await this.prismaClient.calIdMembership.findFirst({
      where: {
        userId,
        calIdTeamId,
        acceptedInvitation: true,
      },
      select: {
        id: true,
      },
    });
    return !!membership;
  }

  async listAcceptedTeamMemberIds({ calIdTeamId }: { calIdTeamId: number }): Promise<number[]> {
    const memberships =
      (await this.prismaClient.calIdMembership.findMany({
        where: {
          calIdTeamId,
          acceptedInvitation: true,
        },
        select: {
          userId: true,
        },
      })) || [];
    const teamMemberIds = memberships.map((membership) => membership.userId);
    return teamMemberIds;
  }

  static async create(data: ICalIdMembership) {
    return await prisma.calIdMembership.create({
      data: {
        createdAt: new Date(),
        ...data,
      },
    });
  }

  static async findFirstAcceptedMembershipByUserId(userId: number) {
    return await prisma.calIdMembership.findFirst({
      where: {
        acceptedInvitation: true,
        userId,
        calIdTeam: {
          slug: {
            not: null,
          },
        },
      },
    });
  }

  static async createMany(data: ICalIdMembership[]) {
    return await prisma.calIdMembership.createMany({
      data: data.map((item) => ({
        createdAt: new Date(),
        ...item,
      })),
    });
  }

  /**
   * Get all calIdTeam IDs that a user is a member of
   */
  static async findUserCalIdTeamIds({ userId }: { userId: number }) {
    const memberships = await prisma.calIdMembership.findMany({
      where: {
        userId,
        acceptedInvitation: true,
      },
      select: {
        calIdTeamId: true,
      },
    });

    return memberships.map((membership) => membership.calIdTeamId);
  }

  static async findUniqueByUserIdAndCalIdTeamId({ userId, calIdTeamId }: { userId: number; calIdTeamId: number }) {
    return await prisma.calIdMembership.findUnique({
      where: {
        userId_calIdTeamId: {
          userId,
          calIdTeamId,
        },
      },
    });
  }

  static async getAdminOrOwnerMembership(userId: number, calIdTeamId: number) {
    return prisma.calIdMembership.findFirst({
      where: {
        userId,
        calIdTeamId,
        acceptedInvitation: true,
        role: {
          in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
        },
      },
      select: {
        id: true,
      },
    });
  }

  static async findAllAcceptedPublishedCalIdTeamMemberships(userId: number, tx?: PrismaTransaction) {
    return (tx ?? prisma).calIdMembership.findMany({
      where: {
        userId,
        acceptedInvitation: true,
        calIdTeam: {
          slug: { not: null },
        },
      },
      select: {
        calIdTeamId: true,
      },
    });
  }

  static async findAllByCalIdTeamIds<TSelect extends CalIdMembershipPartialSelect = { userId: true }>({
    calIdTeamIds,
    select,
  }: {
    calIdTeamIds: number[];
    select?: TSelect;
  }): Promise<CalIdMembershipDTOFromSelect<TSelect>[]> {
    return (await prisma.calIdMembership.findMany({
      where: {
        calIdTeamId: { in: calIdTeamIds },
        acceptedInvitation: true,
      },
      // this is explicit, and typed in TSelect default typings
      select: select ?? { userId: true },
    })) as unknown as Promise<CalIdMembershipDTOFromSelect<TSelect>[]>;
  }
}
