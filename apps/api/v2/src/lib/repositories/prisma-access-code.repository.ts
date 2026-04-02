import { PrismaAccessCodeRepository as PrismaAccessCodeRepositoryLib } from "@calcom/platform-libraries/repositories";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaAccessCodeRepository extends PrismaAccessCodeRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
