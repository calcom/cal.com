import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaOOORepository } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class OOORepository extends PrismaOOORepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
