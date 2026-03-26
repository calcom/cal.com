import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaProfileRepository as BasePrismaProfileRepository } from "@calcom/platform-libraries/repositories";

@Injectable()
export class PrismaProfileRepository extends BasePrismaProfileRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super({ prismaClient: dbWrite.prisma });
  }
}
