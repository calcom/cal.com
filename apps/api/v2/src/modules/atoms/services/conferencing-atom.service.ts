import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { getConnectedApps, ConnectedApps } from "@calcom/platform-libraries-1.2.3";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class ConferencingAtomsService {
  private logger = new Logger("ConferencingAtomService");

  constructor(
    private readonly dbWrite: PrismaWriteService,
    private readonly usersRepository: UsersRepository
  ) {}

  async getConferencingApps(userId: number): ConnectedApps {
    const user = await this.usersRepository.findById(userId);
    return getConnectedApps({
      user,
      input: {
        variant: "conferencing",
        onlyInstalled: true,
      },
      prisma: this.dbWrite.prisma as unknown as PrismaClient,
    });
  }
}
