import { PrismaBookingReferenceRepository as BasePrismaBookingReferenceRepository } from "@calcom/platform-libraries/repositories";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaBookingReferenceRepository extends BasePrismaBookingReferenceRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super({ prismaClient: dbWrite.prisma });
  }
}
