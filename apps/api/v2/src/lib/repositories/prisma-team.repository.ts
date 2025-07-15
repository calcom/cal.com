import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { Injectable } from "@nestjs/common";

import { PrismaTeamRepository as PrismaTeamRepositoryLib } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaTeamRepository extends PrismaTeamRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
