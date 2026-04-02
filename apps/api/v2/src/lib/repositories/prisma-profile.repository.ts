import { PrismaProfileRepository as BasePrismaProfileRepository } from "@calcom/platform-libraries/repositories";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaProfileRepository extends BasePrismaProfileRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super({ prismaClient: dbWrite.prisma });
  }
}
