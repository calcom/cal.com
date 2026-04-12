import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { GOOGLE_MEET_TYPE } from "@calcom/platform-constants";
import type { Prisma } from "@calcom/prisma/client";

@Injectable()
export class ConferencingRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  private readonly credentialSelect = {
    id: true,
    type: true,
    userId: true,
    teamId: true,
    appId: true,
    subscriptionId: true,
    paymentStatus: true,
    billingCycleStart: true,
    invalid: true,
    delegationCredentialId: true,
  } satisfies Prisma.CredentialSelect;

  async findConferencingApps(userId: number) {
    return this.dbRead.prisma.credential.findMany({
      where: {
        userId,
        type: { endsWith: "_video" },
      },
      select: this.credentialSelect,
    });
  }

  async findTeamConferencingApps(teamId: number) {
    return this.dbRead.prisma.credential.findMany({
      where: {
        teamId,
        type: { endsWith: "_video" },
      },
      select: this.credentialSelect,
    });
  }

  async findGoogleMeet(userId: number) {
    return this.dbRead.prisma.credential.findFirst({
      where: { userId, type: GOOGLE_MEET_TYPE },
      select: this.credentialSelect,
    });
  }

  async findConferencingApp(userId: number, app: string) {
    return this.dbRead.prisma.credential.findFirst({
      where: { userId, appId: app },
      select: this.credentialSelect,
    });
  }

  async findTeamConferencingApp(teamId: number, app: string) {
    return this.dbRead.prisma.credential.findFirst({
      where: { teamId, appId: app },
      select: this.credentialSelect,
    });
  }
}
