import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaBookingAttendeeRepository as BasePrismaBookingAttendeeRepository } from "@calcom/platform-libraries/repositories";

@Injectable()
export class PrismaBookingAttendeeRepository extends BasePrismaBookingAttendeeRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma);
  }
}
