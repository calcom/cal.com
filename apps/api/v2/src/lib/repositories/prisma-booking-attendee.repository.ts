import { PrismaBookingAttendeeRepository as BasePrismaBookingAttendeeRepository } from "@calcom/platform-libraries/repositories";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaBookingAttendeeRepository extends BasePrismaBookingAttendeeRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma);
  }
}
