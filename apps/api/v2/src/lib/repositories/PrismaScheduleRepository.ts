import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaScheduleRepository } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class ScheduleRepository extends PrismaScheduleRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
